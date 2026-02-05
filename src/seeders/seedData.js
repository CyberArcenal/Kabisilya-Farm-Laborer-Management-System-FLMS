// src/seeders/seedData.js
//@ts-check
const { DataSource } = require("typeorm");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const { getDatabaseConfig } = require("../main/db/database");

// Create a fresh data source for seeding (don't use the shared one)
async function createSeedDataSource() {
  const config = getDatabaseConfig();

  // Override some settings for seeding
  const seedConfig = {
    ...config,
    synchronize: false, // We'll handle synchronization manually
    logging: false,
  };

  // @ts-ignore
  return new DataSource(seedConfig);
}

async function seedData() {
  console.log("🚀 Starting database seeding...");

  let seedDataSource;

  try {
    // Check if we should reset the database
    const shouldReset = process.argv.includes("--reset");

    if (shouldReset) {
      console.log("🔄 Resetting database before seeding...");
      await resetDatabase();
    }

    // Create a fresh data source for seeding
    console.log("Creating seed data source...");
    seedDataSource = await createSeedDataSource();

    // Initialize the data source
    console.log("Initializing database...");
    await seedDataSource.initialize();
    console.log("✅ Database connected");

    // Disable foreign keys during seeding to avoid constraints
    await seedDataSource.query("PRAGMA foreign_keys = OFF");

    // For reset mode, drop all tables first
    if (shouldReset) {
      console.log("🔄 Dropping existing tables...");
      try {
        const entities = seedDataSource.entityMetadatas;
        for (const entity of entities) {
          const repository = seedDataSource.getRepository(entity.name);
          await repository.clear();
        }
        console.log("✅ Tables cleared");
      } catch (error) {
        // @ts-ignore
        console.log(
          "ℹ️ Could not clear tables (might not exist yet):",
          // @ts-ignore
          error.message,
        );
      }
    }

    // Synchronize the database (create tables if they don't exist)
    console.log("🔄 Synchronizing database...");

    // Don't use synchronize() which creates transactions
    // Instead, manually create tables using query runner
    const queryRunner = seedDataSource.createQueryRunner();
    await queryRunner.connect();

    // Start a single transaction for the entire sync
    await queryRunner.startTransaction();

    try {
      // Drop all existing tables
      const dropQuery = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `;
      const tables = await queryRunner.query(dropQuery);

      for (const table of tables) {
        await queryRunner.query(`DROP TABLE IF EXISTS "${table.name}"`);
      }

      // Create all tables
      await seedDataSource.synchronize();

      await queryRunner.commitTransaction();
      console.log("✅ Database synchronized");
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Get repositories
    const sessionRepo = seedDataSource.getRepository("Session"); // ✅ NEW
    const bukidRepo = seedDataSource.getRepository("Bukid");
    const pitakRepo = seedDataSource.getRepository("Pitak");
    const workerRepo = seedDataSource.getRepository("Worker");
    const assignmentRepo = seedDataSource.getRepository("Assignment");
    const debtRepo = seedDataSource.getRepository("Debt");
    const debtHistoryRepo = seedDataSource.getRepository("DebtHistory");
    const paymentRepo = seedDataSource.getRepository("Payment");
    const paymentHistoryRepo = seedDataSource.getRepository("PaymentHistory");
    const userRepo = seedDataSource.getRepository("User");
    const userActivityRepo = seedDataSource.getRepository("UserActivity");
    const auditTrailRepo = seedDataSource.getRepository("AuditTrail");
    const notificationRepo = seedDataSource.getRepository("Notification");
    const systemSettingRepo = seedDataSource.getRepository("SystemSetting");

    console.log("📅 Seeding Sessions..."); // ✅ NEW
    const sessions = await seedSessions(sessionRepo);

    console.log("🏞️ Seeding Bukids...");
    const bukids = await seedBukids(bukidRepo, sessions); // ✅ UPDATED

    console.log("📍 Seeding Pitaks...");
    const pitaks = await seedPitaks(pitakRepo, bukids);

    console.log("👷 Seeding Workers...");
    const workers = await seedWorkers(workerRepo);

    console.log("📋 Seeding Assignments...");
    // const assignments = await seedAssignments(assignmentRepo, workers, pitaks, sessions); // ✅ UPDATED

    console.log("💸 Seeding Debts...");
    // const debts = await seedDebts(debtRepo, workers, sessions); // ✅ UPDATED

    console.log("📝 Seeding Debt History...");
    // await seedDebtHistory(debtHistoryRepo, debts);

    console.log("💰 Seeding Payments...");
    // const payments = await seedPayments(paymentRepo, workers, pitaks, sessions); // ✅ UPDATED

    console.log("📊 Seeding Payment History...");
    // await seedPaymentHistory(paymentHistoryRepo, payments);

    console.log("👤 Seeding Users...");
    const users = await seedUsers(userRepo);

    console.log("📱 Seeding User Activities...");
    // await seedUserActivities(userActivityRepo, users, sessions); // ✅ UPDATED

    console.log("🔍 Seeding Audit Trails...");
    // await seedAuditTrails(auditTrailRepo);

    console.log("🔔 Seeding Notifications...");
    // await seedNotifications(notificationRepo);

    console.log("⚙️ Seeding System Settings...");
    // await seedSystemSettings(systemSettingRepo);

    // Re-enable foreign keys
    await seedDataSource.query("PRAGMA foreign_keys = ON");

    console.log("✅ Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Sessions: ${sessions.length}`); // ✅ NEW
    console.log(`   Bukids: ${bukids.length}`);
    console.log(`   Pitaks: ${pitaks.length}`);
    console.log(`   Workers: ${workers.length}`);
    // console.log(`   Assignments: ${assignments.length}`);
    // console.log(`   Debts: ${debts.length}`);
    // console.log(`   Payments: ${payments.length}`);
    console.log(`   Users: ${users.length}`);

    // Destroy the connection when done
    await seedDataSource.destroy();
    console.log("✅ Connection closed");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);

    // Try to destroy connection on error
    if (seedDataSource && seedDataSource.isInitialized) {
      await seedDataSource.destroy().catch(() => {});
    }

    process.exit(1);
  }
}

async function resetDatabase() {
  try {
    console.log("🔄 Resetting database...");

    const { getDatabaseConfig } = require("../main/db/database");
    const config = getDatabaseConfig();
    const dbPath = config.database;

    console.log(`Database path: ${dbPath}`);

    // Delete the database file and any journal files
    if (dbPath && dbPath !== ":memory:" && fs.existsSync(dbPath)) {
      console.log(`🗑️  Deleting database file: ${dbPath}`);
      try {
        fs.unlinkSync(dbPath);
        console.log("✅ Database file deleted");
      } catch (error) {
        // @ts-ignore
        console.warn("⚠️ Could not delete database file:", error.message);
      }
    }

    // Delete any journal files
    const journalFiles = [
      `${dbPath}-journal`,
      `${dbPath}-wal`,
      `${dbPath}-shm`,
    ];

    journalFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`✅ Deleted ${file}`);
        } catch (error) {
          // Ignore errors
        }
      }
    });

    console.log("✅ Database reset complete");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  }
}

// ===================== SEED FUNCTIONS =====================

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 */
async function seedSessions(repository) { // ✅ NEW FUNCTION
  const sessions = [
    {
      name: "First Cropping 2024",
      seasonType: "tag-araw",
      year: 2024,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-06-30"),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Second Cropping 2024",
      seasonType: "tag-ulan",
      year: 2024,
      startDate: new Date("2024-07-01"),
      endDate: new Date("2024-12-31"),
      status: "closed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "First Cropping 2025",
      seasonType: "tag-araw",
      year: 2025,
      startDate: new Date("2025-01-01"),
      endDate: null, // Ongoing
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const savedSessions = [];
  for (const session of sessions) {
    const saved = await repository.save(session);
    savedSessions.push(saved);
  }

  return savedSessions;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} sessions
 */
async function seedBukids(repository, sessions) { // ✅ UPDATED
  const bukids = [
    {
      name: "Bukid A",
      status: "active",
      location: "North Section",
      session: sessions[0], // Active session (First Cropping 2024)
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bukid B",
      status: "active",
      location: "South Section",
      session: sessions[0], // Active session (First Cropping 2024)
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bukid C",
      status: "inactive",
      location: "East Section",
      session: sessions[1], // Closed session (Second Cropping 2024)
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bukid D",
      status: "active",
      location: "West Section",
      session: sessions[2], // Current active session (First Cropping 2025)
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const savedBukids = [];
  for (const bukid of bukids) {
    const saved = await repository.save(bukid);
    savedBukids.push(saved);
  }

  return savedBukids;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} bukids
 */
async function seedPitaks(repository, bukids) {
  const pitaks = [
    {
      location: "Plot 1-A",
      totalLuwang: "50.00",
      status: "active",
      bukid: bukids[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      location: "Plot 1-B",
      totalLuwang: "45.50",
      status: "active",
      bukid: bukids[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      location: "Plot 2-A",
      totalLuwang: "60.00",
      status: "completed",
      bukid: bukids[1],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      location: "Plot 3-A",
      totalLuwang: "30.25",
      status: "active",
      bukid: bukids[2],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      location: "Plot 4-A",
      totalLuwang: "55.75",
      status: "active",
      bukid: bukids[3],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const savedPitaks = [];
  for (const pitak of pitaks) {
    const saved = await repository.save(pitak);
    savedPitaks.push(saved);
  }

  return savedPitaks;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 */
async function seedWorkers(repository) {
  const workers = [
    {
      name: "Juan Dela Cruz",
      contact: "+639123456789",
      email: "juan.delacruz@example.com",
      address: "123 Main St, Brgy. Sample",
      status: "active",
      hireDate: new Date("2023-01-15"),
      totalDebt: "5000.00",
      totalPaid: "12000.00",
      currentBalance: "500.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Maria Santos",
      contact: "+639987654321",
      email: "maria.santos@example.com",
      address: "456 Oak St, Brgy. Example",
      status: "active",
      hireDate: new Date("2023-02-20"),
      totalDebt: "3000.00",
      totalPaid: "8000.00",
      currentBalance: "200.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Pedro Reyes",
      contact: "+639555123456",
      email: "pedro.reyes@example.com",
      address: "789 Pine St, Brgy. Test",
      status: "on-leave",
      hireDate: new Date("2022-11-10"),
      totalDebt: "2000.00",
      totalPaid: "15000.00",
      currentBalance: "0.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Ana Garcia",
      contact: "+639666789012",
      email: "ana.garcia@example.com",
      address: "321 Elm St, Brgy. Demo",
      status: "active",
      hireDate: new Date("2023-03-05"),
      totalDebt: "0.00",
      totalPaid: "5000.00",
      currentBalance: "100.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Luis Torres",
      contact: "+639777890123",
      email: "luis.torres@example.com",
      address: "654 Maple St, Brgy. Trial",
      status: "inactive",
      hireDate: new Date("2022-08-15"),
      totalDebt: "10000.00",
      totalPaid: "20000.00",
      currentBalance: "5000.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const savedWorkers = [];
  for (const worker of workers) {
    const saved = await repository.save(worker);
    savedWorkers.push(saved);
  }

  return savedWorkers;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} workers
 * @param {any[]} pitaks
 * @param {any[]} sessions
 */
async function seedAssignments(repository, workers, pitaks, sessions) { // ✅ UPDATED
  const assignments = [
    {
      luwangCount: "10.00",
      assignmentDate: new Date("2024-01-15"),
      status: "completed",
      notes: "Regular assignment",
      worker: workers[0],
      pitak: pitaks[0],
      session: sessions[0], // First Cropping 2024
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-20"),
    },
    {
      luwangCount: "8.50",
      assignmentDate: new Date("2024-01-16"),
      status: "active",
      notes: "New assignment",
      worker: workers[0],
      pitak: pitaks[1],
      session: sessions[0], // First Cropping 2024
      createdAt: new Date("2024-01-16"),
      updatedAt: new Date("2024-01-16"),
    },
    {
      luwangCount: "12.75",
      assignmentDate: new Date("2025-01-10"),
      status: "active",
      notes: "New cropping season assignment",
      worker: workers[1],
      pitak: pitaks[4],
      session: sessions[2], // First Cropping 2025 (current)
      createdAt: new Date("2025-01-10"),
      updatedAt: new Date("2025-01-10"),
    },
  ];

  const savedAssignments = [];
  for (const assignment of assignments) {
    const saved = await repository.save(assignment);
    savedAssignments.push(saved);
  }

  return savedAssignments;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} workers
 * @param {any[]} sessions
 */
async function seedDebts(repository, workers, sessions) { // ✅ UPDATED
  const debts = [
    {
      originalAmount: "5000.00",
      amount: "5000.00",
      reason: "Emergency loan for medical expenses",
      balance: "500.00",
      status: "partially_paid",
      dateIncurred: new Date("2023-11-01"),
      dueDate: new Date("2024-03-01"),
      paymentTerm: "6 months",
      interestRate: "5.00",
      totalInterest: "250.00",
      totalPaid: "4500.00",
      lastPaymentDate: new Date("2024-01-10"),
      worker: workers[0],
      session: sessions[0], // First Cropping 2024
      createdAt: new Date("2023-11-01"),
      updatedAt: new Date("2024-01-10"),
    },
    {
      originalAmount: "3000.00",
      amount: "3000.00",
      reason: "Advance salary",
      balance: "200.00",
      status: "partially_paid",
      dateIncurred: new Date("2023-12-15"),
      dueDate: new Date("2024-02-15"),
      paymentTerm: "2 months",
      interestRate: "0.00",
      totalInterest: "0.00",
      totalPaid: "2800.00",
      lastPaymentDate: new Date("2024-01-15"),
      worker: workers[1],
      session: sessions[0], // First Cropping 2024
      createdAt: new Date("2023-12-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      originalAmount: "1500.00",
      amount: "1500.00",
      reason: "Seed purchase",
      balance: "1500.00",
      status: "pending",
      dateIncurred: new Date("2025-01-05"),
      dueDate: new Date("2025-04-05"),
      paymentTerm: "3 months",
      interestRate: "0.00",
      totalInterest: "0.00",
      totalPaid: "0.00",
      lastPaymentDate: null,
      worker: workers[3],
      session: sessions[2], // First Cropping 2025
      createdAt: new Date("2025-01-05"),
      updatedAt: new Date("2025-01-05"),
    },
  ];

  const savedDebts = [];
  for (const debt of debts) {
    const saved = await repository.save(debt);
    savedDebts.push(saved);
  }

  return savedDebts;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} debts
 */
async function seedDebtHistory(repository, debts) {
  const histories = [
    {
      amountPaid: "1000.00",
      previousBalance: "5000.00",
      newBalance: "4000.00",
      transactionType: "payment",
      paymentMethod: "cash",
      referenceNumber: "PAY-001",
      notes: "Initial payment",
      transactionDate: new Date("2023-11-15"),
      debt: debts[0],
      createdAt: new Date("2023-11-15"),
    },
    {
      amountPaid: "500.00",
      previousBalance: "4000.00",
      newBalance: "3500.00",
      transactionType: "payment",
      paymentMethod: "salary_deduction",
      referenceNumber: "PAY-002",
      notes: "Salary deduction",
      transactionDate: new Date("2023-12-15"),
      debt: debts[0],
      createdAt: new Date("2023-12-15"),
    },
  ];

  for (const history of histories) {
    await repository.save(history);
  }
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} workers
 * @param {any[]} pitaks
 * @param {any[]} sessions
 */
async function seedPayments(repository, workers, pitaks, sessions) { // ✅ UPDATED
  const payments = [
    {
      grossPay: "5000.00",
      manualDeduction: "200.00",
      netPay: "4800.00",
      status: "completed",
      paymentDate: new Date("2024-01-15"),
      paymentMethod: "cash",
      referenceNumber: "PAY-2024-001",
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-15"),
      totalDebtDeduction: "1500.00",
      otherDeductions: "200.00",
      deductionBreakdown: JSON.stringify({ debt: 1500, tax: 200 }),
      notes: "Bi-weekly payment for First Cropping 2024",
      worker: workers[0],
      pitak: pitaks[0],
      session: sessions[0], // First Cropping 2024
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      grossPay: "4500.00",
      manualDeduction: "100.00",
      netPay: "4400.00",
      status: "completed",
      paymentDate: new Date("2024-02-01"),
      paymentMethod: "bank_transfer",
      referenceNumber: "PAY-2024-002",
      periodStart: new Date("2024-01-16"),
      periodEnd: new Date("2024-01-31"),
      totalDebtDeduction: "800.00",
      otherDeductions: "100.00",
      deductionBreakdown: JSON.stringify({ debt: 800, insurance: 100 }),
      notes: "Second payment for First Cropping 2024",
      worker: workers[1],
      pitak: pitaks[1],
      session: sessions[0], // First Cropping 2024
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
    },
    {
      grossPay: "6000.00",
      manualDeduction: "300.00",
      netPay: "5700.00",
      status: "pending",
      paymentDate: null,
      paymentMethod: null,
      referenceNumber: null,
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-15"),
      totalDebtDeduction: "0.00",
      otherDeductions: "300.00",
      deductionBreakdown: JSON.stringify({ insurance: 300 }),
      notes: "First payment for First Cropping 2025",
      worker: workers[3],
      pitak: pitaks[4],
      session: sessions[2], // First Cropping 2025
      createdAt: new Date("2025-01-16"),
      updatedAt: new Date("2025-01-16"),
    },
  ];

  const savedPayments = [];
  for (const payment of payments) {
    const saved = await repository.save(payment);
    savedPayments.push(saved);
  }

  return savedPayments;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} payments
 */
async function seedPaymentHistory(repository, payments) {
  const histories = [
    {
      actionType: "create",
      changedField: "grossPay",
      oldValue: null,
      newValue: "5000.00",
      oldAmount: "0.00",
      newAmount: "5000.00",
      notes: "Payment created for First Cropping 2024",
      performedBy: "admin",
      payment: payments[0],
      changeDate: new Date("2024-01-15"),
    },
    {
      actionType: "status_change",
      changedField: "status",
      oldValue: "pending",
      newValue: "completed",
      oldAmount: null,
      newAmount: null,
      notes: "Payment marked as completed",
      performedBy: "manager",
      payment: payments[0],
      changeDate: new Date("2024-01-16"),
    },
  ];

  for (const history of histories) {
    await repository.save(history);
  }
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 */
async function seedUsers(repository) {
  // Hash passwords
  const salt = bcrypt.genSaltSync(10);
  const adminPassword = bcrypt.hashSync("admin123", salt);
  const userPassword = bcrypt.hashSync("user123", salt);

  const users = [
    {
      username: "admin",
      email: "admin@farm.com",
      password: adminPassword,
      role: "admin",
      isActive: true,
      lastLogin: new Date("2024-01-20"),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-20"),
    },
    {
      username: "manager",
      email: "manager@farm.com",
      password: userPassword,
      role: "manager",
      isActive: true,
      lastLogin: new Date("2024-01-19"),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-19"),
    },
    {
      username: "supervisor",
      email: "supervisor@farm.com",
      password: userPassword,
      role: "manager",
      isActive: true,
      lastLogin: new Date("2024-01-18"),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-18"),
    },
  ];

  const savedUsers = [];
  for (const user of users) {
    const saved = await repository.save(user);
    savedUsers.push(saved);
  }

  return savedUsers;
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 * @param {any[]} users
 * @param {any[]} sessions
 */
async function seedUserActivities(repository, users, sessions) { // ✅ UPDATED
  const activities = [
    {
      user_id: users[0].id,
      action: "login",
      entity: null,
      entity_id: null,
      ip_address: "192.168.1.100",
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      details: "Successful login",
      created_at: new Date("2024-01-20 08:30:00"),
    },
    {
      user_id: users[1].id,
      action: "session_create",
      entity: "Session",
      entity_id: sessions[2].id,
      ip_address: "192.168.1.101",
      user_agent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      details: "Created new session: First Cropping 2025",
      session: sessions[2], // Link to the created session
      created_at: new Date("2025-01-01 09:00:00"),
    },
    {
      user_id: users[2].id,
      action: "assignment_create",
      entity: "Assignment",
      entity_id: 3,
      ip_address: "192.168.1.102",
      user_agent:
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
      details: "Created assignment for worker Maria Santos",
      session: sessions[2], // Link to the session
      created_at: new Date("2025-01-10 10:15:00"),
    },
  ];

  for (const activity of activities) {
    await repository.save(activity);
  }
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 */
async function seedAuditTrails(repository) {
  const trails = [
    {
      action: "DATA_EXPORT",
      actor: "system",
      details: JSON.stringify({ format: "CSV", entity: "workers", count: 5 }),
      timestamp: new Date("2024-01-20 10:00:00"),
    },
    {
      action: "SESSION_CREATE",
      actor: "manager",
      details: JSON.stringify({ 
        session_name: "First Cropping 2025", 
        session_id: 3,
        season_type: "tag-araw" 
      }),
      timestamp: new Date("2025-01-01 09:05:00"),
    },
  ];

  for (const trail of trails) {
    await repository.save(trail);
  }
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 */
async function seedNotifications(repository) {
  const notifications = [
    {
      type: "payment_due",
      context: JSON.stringify({
        workerId: 1,
        amount: "500.00",
        dueDate: "2024-01-25",
      }),
      timestamp: new Date(),
    },
    {
      type: "session_start",
      context: JSON.stringify({
        sessionId: 3,
        sessionName: "First Cropping 2025",
        startDate: "2025-01-01",
      }),
      timestamp: new Date("2024-12-28"),
    },
  ];

  for (const notification of notifications) {
    await repository.save(notification);
  }
}

/**
 * @param {import("typeorm").Repository<import("typeorm").ObjectLiteral>} repository
 */
async function seedSystemSettings(repository) {
  const { SettingType } = require("../entities/systemSettings");

  const settings = [
    {
      key: "company_name",
      value: "Farm Management System",
      setting_type: SettingType.GENERAL,
      description: "Name of the company/farm",
      is_public: true,
      is_deleted: false,
    },
    {
      key: "currency",
      value: "PHP",
      setting_type: SettingType.GENERAL,
      description: "Default currency",
      is_public: true,
      is_deleted: false,
    },
    {
      key: "payment_terms",
      value: "15",
      setting_type: SettingType.GENERAL,
      description: "Default payment terms in days",
      is_public: false,
      is_deleted: false,
    },
    {
      key: "current_session_id",
      value: "3",
      setting_type: SettingType.GENERAL,
      description: "ID of the currently active session",
      is_public: false,
      is_deleted: false,
    },
    {
      key: "season_duration",
      value: "180",
      setting_type: SettingType.GENERAL,
      description: "Default season duration in days",
      is_public: false,
      is_deleted: false,
    },
  ];

  for (const setting of settings) {
    await repository.save(setting);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };