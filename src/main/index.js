// src/main/index.js
//@ts-check
const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
require("reflect-metadata");
const { AppDataSource } = require("./db/dataSource");
const MigrationManager = require("../utils/migrationManager");

// Configuration
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Global window references
/**
 * @type {BrowserWindow | null}
 */
let mainWindow = null;
/**
 * @type {BrowserWindow | null}
 */
let splashWindow = null;
let dbClosed = false;
/**
 * @type {MigrationManager | null}
 */
let migrationManager = null;

// Logging utility
/**
 * @param {string} level
 * @param {string} message
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Kabisilya ${level}] ${message}`;
  console.log(logMessage);
  if (data) console.log(`[${timestamp}] [DATA]`, data);
}

// Database functions
function safeCloseDB() {
  if (AppDataSource.isInitialized && !dbClosed) {
    dbClosed = true;
    AppDataSource.destroy()
      .then(() => log("INFO", "Database connection closed"))
      .catch((/** @type {string} */ err) =>
        log("ERROR", "Error closing DB: " + err),
      );
  }
}

// In your src/main/index.js, update the database initialization section:

// ===================== DATABASE FUNCTIONS WITH MIGRATION MANAGER =====================
async function initializeDatabase() {
  try {
    log("INFO", "Initializing database connection...");

    // Get database path for logging
    const dbPath = AppDataSource.options.database;
    log("INFO", `Database path: ${dbPath}`);

    // Initialize the data source
    
    await AppDataSource.initialize();
    log("SUCCESS", "Database connected successfully!");

    // Create migration manager (simplified for now)
    migrationManager = new MigrationManager(AppDataSource);
    log("INFO", "Migration Manager initialized");

    // Check migration status
    const migrationStatus = await migrationManager.getMigrationStatus();
    // @ts-ignore
    log("INFO", "Migration status checked", {
      // @ts-ignore
      pendingMigrations: migrationStatus.pendingMigrations,
      // @ts-ignore
      executedCount: migrationStatus.executedMigrations.length,
      // @ts-ignore
      lastMigration: migrationStatus.lastMigration,
    });

    // If there are pending migrations
    // @ts-ignore
    if (migrationStatus.needsMigration || migrationStatus.pendingMigrations) {
      log("INFO", "Pending migrations found. Starting migration process...");

      // Show migration status in splash window if available
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send("migration:start", {
          message: "Updating database...",
          // @ts-ignore
          pendingCount: migrationStatus.pendingMigrations,
        });
      }

      // Try to run migrations directly
      try {
        log("INFO", "Running migrations...");
        const migrations = await AppDataSource.runMigrations();

        if (migrations && migrations.length > 0) {
          log(
            "SUCCESS",
            `Applied ${migrations.length} migrations successfully`,
          );

          // Log each applied migration
          migrations.forEach((migration, index) => {
            log("INFO", `  ${index + 1}. ${migration.name}`);
          });

          // Update splash window
          if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.send("migration:complete", {
              message: "Database updated successfully",
              appliedCount: migrations.length,
            });
          }
        } else {
          log("INFO", "No migrations were needed or applied");
        }
      } catch (migrationError) {
        // @ts-ignore
        log("ERROR", "Migration failed, trying synchronize:", migrationError);

        // Try to synchronize as fallback
        try {
          log("WARN", "Attempting to synchronize database as fallback...");
          await AppDataSource.synchronize();
          log("WARN", "Database synchronized as fallback");

          if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.send("migration:complete", {
              message: "Database synchronized",
              appliedCount: 0,
            });
          }
        } catch (syncError) {
          // @ts-ignore
          log("ERROR", "Synchronization also failed:", syncError);
          throw migrationError; // Throw original error
        }
      }
    } else {
      log("INFO", "No pending migrations. Database is up to date.");
    }

    // Ensure basic tables exist (simplified)
    await ensureDatabaseTables();

    // Test connection (skip for now if it causes issues)
    try {
      await AppDataSource.query("SELECT 1");
      log("SUCCESS", "Database connection test passed!");
    } catch (queryError) {
      log("WARN", "Database query test skipped or failed");
    }

    return {
      success: true,
      message: "Database initialized successfully",
      migrationStatus: migrationStatus,
    };
  } catch (error) {
    // @ts-ignore
    log("ERROR", "Database initialization failed:", error);

    // Try to recover using simple synchronization
    try {
      log("INFO", "Attempting database recovery by synchronization...");

      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      await AppDataSource.synchronize();
      log("WARN", "Database recovered by synchronization");

      return {
        success: true,
        message: "Database recovered by synchronization",
        recovered: true,
      };
    } catch (recoveryError) {
      // @ts-ignore
      log("ERROR", "Database recovery also failed:", recoveryError);

      return {
        success: false,
        // @ts-ignore
        message: error.message || "Unknown database error",
        error: error,
      };
    }
  }
}

// @ts-ignore
async function ensureDatabaseTables() {
  try {
    log("INFO", "Ensuring database tables exist...");

    // Check if any table exists
    const tableCheck = await AppDataSource.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='workers'
    `);

    if (tableCheck.length === 0) {
      log("WARN", "Database tables don't exist. Creating tables...");
      await AppDataSource.synchronize();
      log("SUCCESS", "Database tables created successfully");
    }

    log("INFO", "Database tables already exist");
    return { created: false, message: "Tables already exist" };
  } catch (error) {
    // @ts-ignore
    log("ERROR", "Failed to ensure database tables:", error);
    throw error;
  }
}

// Window creation functions
async function createSplashWindow() {
  try {
    log("INFO", "Creating splash window...");
    splashWindow = new BrowserWindow({
      width: 500,
      height: 400,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      center: true,
      resizable: false,
      movable: false,
      fullscreenable: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    const splashPath = path.join(__dirname, "splash.html");
    await splashWindow.loadFile(splashPath);
    splashWindow.show();
    log("SUCCESS", "Splash window created");
    return splashWindow;
  } catch (error) {
    // @ts-ignore
    log("ERROR", "Failed to create splash window", error);
    return null;
  }
}

function getAppUrl() {
  if (isDev) {
    const devServerURL = "http://localhost:5173";
    log("INFO", `Development mode - URL: ${devServerURL}`);
    return devServerURL;
  } else {
    const prodPath = path.join(__dirname, "..", "..", "dist", "renderer", "index.html");

    if (!fs.existsSync(prodPath)) {
      const possiblePaths = [
        prodPath,
        path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "dist",
          "index.html",
        ),
        path.join(process.resourcesPath, "dist", "index.html"),
        path.join(app.getAppPath(), "dist", "index.html"),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          log("INFO", `Found production build at: ${p}`);
          return `file://${p}`;
        }
      }

      throw new Error(
        `Production build not found. Checked: ${possiblePaths.join(", ")}`,
      );
    }

    log("INFO", `Production mode - file: ${prodPath}`);
    return `file://${prodPath}`;
  }
}

function getIconPath() {
  const platform = process.platform;
  if (isDev) {
    const devIconDir = path.resolve(__dirname, "..", "..", "assets");
    if (platform === "win32") return path.join(devIconDir, "icon.ico");
    if (platform === "darwin") return path.join(devIconDir, "icon.icns");
    return path.join(devIconDir, "icon.png");
  } else {
    const resourcesPath = process.resourcesPath;
    if (platform === "win32")
      return path.join(resourcesPath, "build", "icon.ico");
    if (platform === "darwin") return path.join(resourcesPath, "icon.icns");
    return path.join(resourcesPath, "build", "icon.png");
  }
}

async function createMainWindow() {
  try {
    log("INFO", "Creating main window...");

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = 1366,
      windowHeight = 768;
    const x = Math.max(0, Math.floor((width - windowWidth) / 2));
    const y = Math.max(0, Math.floor((height - windowHeight) / 2));

    mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      minWidth: 1024,
      minHeight: 768,
      show: false,
      frame: true,
      titleBarStyle: "default",
      backgroundColor: "#f0f7f0",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: !isDev,
        allowRunningInsecureContent: isDev,
      },
    });

    mainWindow.setMenu(null);
    mainWindow.setTitle("Kabisilya Management System");

    const iconPath = getIconPath();
    if (fs.existsSync(iconPath)) mainWindow.setIcon(iconPath);
    else log("WARN", `Icon not found: ${iconPath}`);

    // Window event listeners
    mainWindow.on("ready-to-show", () => {
      log("INFO", "Main window ready to show");
      if (splashWindow && !splashWindow.isDestroyed()) {
        setTimeout(() => {
          // @ts-ignore
          splashWindow.close();
          splashWindow = null;
        }, 500);
      }
      // @ts-ignore
      mainWindow.show();
      // @ts-ignore
      mainWindow.focus();
      // @ts-ignore
      mainWindow.center();
      // @ts-ignore
      mainWindow.webContents.send("app-ready");
    });

    const appUrl = getAppUrl();
    log("INFO", `Loading URL: ${appUrl}`);

    try {
      if (!isDev) {
        await mainWindow.loadURL(appUrl);
      } else {
        await mainWindow.loadURL(appUrl);
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
      log("SUCCESS", "Main window loaded successfully");
    } catch (error) {
      const errorMessage = isDev
        ? "Dev server not running. Run 'npm run dev' first."
        : "Production build not found or corrupted.";
      showErrorPage(mainWindow, errorMessage);
      throw error;
    }

    return mainWindow;
  } catch (error) {
    // @ts-ignore
    log("ERROR", "Failed to create main window", error);
    throw error;
  }
}

/**
 * @param {BrowserWindow} window
 * @param {string} message
 */
function showErrorPage(window, message) {
  const errorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 40px;
        }
        .error-container {
          max-width: 500px;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 20px; font-size: 24px; }
        code {
          background: rgba(255, 255, 255, 0.2);
          padding: 10px 20px;
          border-radius: 10px;
          display: block;
          margin: 20px 0;
          font-family: monospace;
        }
        .retry-btn {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s;
        }
        .retry-btn:hover { transform: scale(1.05); }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>⚠️ Application Error</h1>
        <p>${message}</p>
        <code>${isDev ? "http://localhost:5173" : "Production Build"}</code>
        <button class="retry-btn" onclick="location.reload()">Retry</button>
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
          ${
            isDev
              ? "Make sure your development server is running"
              : "Please check if the application is properly installed"
          }
        </p>
      </div>
    </body>
    </html>
  `;

  window.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`,
  );
}

async function continueNormalStartup() {
  try {
    log("INFO", "Starting main window creation...");

    const appUrl = getAppUrl();
    log("INFO", `App URL to load: ${appUrl}`);

    if (!isDev) {
      const filePath = appUrl.replace("file://", "");
      if (!fs.existsSync(filePath)) {
        const errorMsg = `Cannot find application files at: ${filePath}\n\nPlease reinstall the application.`;
        log("ERROR", errorMsg);

        dialog.showErrorBox("File Not Found", errorMsg);

        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }

        const errorWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: false,
          frame: true,
          webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
          },
        });

        showErrorPage(
          errorWindow,
          `Production build not found at: ${filePath}`,
        );
        errorWindow.show();
        return;
      }
    }

    await createMainWindow();
    log("SUCCESS", "✅ Kabisilya Management System started successfully");
  } catch (error) {
    // @ts-ignore
    log("ERROR", "Failed to continue startup", error);

    // @ts-ignore
    const errorMessage = error && error.message ? error.message : String(error);
    dialog.showErrorBox(
      "Startup Error",
      `Failed to start Kabisilya Management System:\n\n${errorMessage}`,
    );

    app.quit();
  }
}

// Main startup flow
app.on("ready", async () => {
  try {
    log("INFO", "🚀 Starting Kabisilya Management System...");
    log("INFO", `Version: ${app.getVersion()}`);
    log("INFO", `Environment: ${isDev ? "Development" : "Production"}`);

    // 1. Create splash window
    await createSplashWindow();

    // 2. Initialize database
    log("INFO", "Starting database initialization...");
    const dbResult = await initializeDatabase();

    // @ts-ignore
    if (!dbResult.success) {
      // @ts-ignore
      log("ERROR", `Database initialization failed: ${dbResult.message}`);

      const dialogResult = dialog.showMessageBoxSync({
        type: "warning",
        title: "Database Warning",
        message: "Database initialization failed",
        // @ts-ignore
        detail: `Error: ${dbResult.message}\n\nThe application may not function properly.`,
        buttons: ["Continue Anyway", "Quit"],
        defaultId: 0,
        cancelId: 1,
      });

      if (dialogResult === 1) {
        app.quit();
        return;
      }

      log(
        "WARN",
        "Continuing with limited functionality due to database issues",
      );
    } else {
      log("SUCCESS", "Database initialized successfully");
    }

    // 3. Register IPC handlers
    registerIpcHandlers();

    // 4. Continue with normal startup
    await continueNormalStartup();

    log("SUCCESS", "✅ Kabisilya Management System started successfully");
  } catch (error) {
    // @ts-ignore
    log("ERROR", "❌ Startup failed", {
      // @ts-ignore
      error: error.message,
      // @ts-ignore
      stack: error.stack,
    });

    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();

    dialog.showErrorBox(
      "Application Startup Error",
      // @ts-ignore
      `Failed to start Kabisilya Management System:\n\n${error.message}\n\nPlease check the logs for details.`,
    );

    app.quit();
  }
});

// Register IPC handlers
function registerIpcHandlers() {
  // Window control handlers
  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window-close", () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on("app-quit", () => {
    app.quit();
  });

  ipcMain.on("show-about", () => {
    dialog.showMessageBox({
      type: "info",
      title: "About Kabisilya Management",
      message: "Kabisilya Management System",
      detail: `Version: ${app.getVersion()}\nFarm Worker and Harvest Management\n© ${new Date().getFullYear()} CyberArcenal`,
      buttons: ["OK"],
    });
  });

  // Database migration handlers
  ipcMain.handle("migration:get-status", async () => {
    try {
      if (migrationManager) {
        return await migrationManager.getMigrationStatus();
      }
      return { error: "Migration manager not initialized" };
    } catch (error) {
      // @ts-ignore
      log("ERROR", "Failed to get migration status", error);
      // @ts-ignore
      return { error: error.message };
    }
  });

  ipcMain.handle("migration:run-manual", async () => {
    try {
      if (migrationManager) {
        const result = await migrationManager.runMigrationsWithBackup();
        return result;
      }
      return { success: false, error: "Migration manager not initialized" };
    } catch (error) {
      // @ts-ignore
      log("ERROR", "Failed to run migrations manually", error);
      // @ts-ignore
      return { success: false, error: error.message };
    }
  });
  require("./ipc/activation.ipc.");
  require("./ipc/assignment/index.ipc");
  require("./ipc/audit/index.ipc");
  require("./ipc/bukid/index.ipc");
  require("./ipc/dashboard/index.ipc");
  require("./ipc/debt/index.ipc");
  // require("./ipc/kabisilya/index.ipc");
  // require("./ipc/notification/index.ipc");
  require("./ipc/payment/index.ipc");
  require("./ipc/pitak/index.ipc");
  require("./ipc/user/index.ipc");
  require("./ipc/worker/index.ipc");
  require("./ipc/system_config.ipc");
  require("./ipc/windows_control.ipc");
  require("./ipc/attendance/index.ipc");
  require("./ipc/session/index.ipc");
}

// Application event handlers
app.on("window-all-closed", () => {
  log("INFO", "All windows closed, closing database connection...");
  safeCloseDB();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  log("INFO", "Application activated");
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on("before-quit", () => {
  log("INFO", "Application quitting...");
});

app.on("will-quit", () => {
  log("INFO", "Application will quit");
  safeCloseDB();
});

app.on("quit", () => {
  log("INFO", "Application quit");
});

// Error handling
process.on("uncaughtException", (error) => {
  // @ts-ignore
  log("ERROR", "Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
});

process.on("unhandledRejection", (reason, promise) => {
  // @ts-ignore
  log("ERROR", "Unhandled promise rejection", {
    // @ts-ignore
    reason: reason?.message || reason,
    promise,
  });
});
