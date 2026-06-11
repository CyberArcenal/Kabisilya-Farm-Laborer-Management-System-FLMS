// src/main/ipc/notificationLog/index.ipc.js
// @ts-check
const { ipcMain } = require("electron");
const {
  notificationLogService,
} = require("../../../../services/NotificationLog");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/datasource");
const { AuditLog } = require("../../../../entities/AuditLog");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

// Status constants (shared with service)
const LOG_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  RESEND: "resend",
};

class NotificationLogHandler {
  constructor(deps = {}) {
    this.service = deps.service || notificationLogService;
    this.auditLogRepo =
      deps.auditLogRepo || AppDataSource.getRepository(AuditLog);
    this.logger = deps.logger || logger;

    // Direct mapping: IPC method name = service method name
    this.methodHandlers = {
      // READ – no transaction
      findAll: { tx: false, handler: this.service.findAll.bind(this.service) },
      findById: {
        tx: false,
        handler: this.service.findById.bind(this.service),
      },
      findByRecipient: { tx: false, handler: this.findByRecipient.bind(this) },
      search: { tx: false, handler: this.search.bind(this) },
      getStatistics: {
        tx: false,
        handler: this.service.getStatistics.bind(this.service),
      },

      // WRITE – need transaction
      updateStatus: { tx: true, handler: this.updateStatus.bind(this) },
      delete: { tx: true, handler: this.service.delete.bind(this.service) },
      retryFailed: { tx: true, handler: this.retryFailed.bind(this) },
      retryAllFailed: { tx: true, handler: this.retryAllFailed.bind(this) },
      resend: { tx: true, handler: this.resend.bind(this) },
    };
  }

  async handleRequest(event, payload) {
    const { method, params = {} } = payload;
    this.logger.info(`NotificationLogHandler: ${method}`, { params });

    const handlerConfig = this.methodHandlers[method];
    if (!handlerConfig) throw new Error(`Unknown method: ${method}`);

    if (handlerConfig.tx) {
      return await this.runInTransaction(handlerConfig.handler, params, event);
    } else {
      return await handlerConfig.handler(params);
    }
  }

  // ---------------------- READ HELPERS (wrappers) ----------------------
  async findByRecipient(params) {
    const { recipient_email, page = 1, limit = 50 } = params;
    if (!recipient_email) {
      return {
        status: false,
        message: "Recipient email is required",
        data: null,
      };
    }
    return await this.service.findAll({
      recipient_email,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
  }

  async search(params) {
    const { keyword, page = 1, limit = 50 } = params;
    if (!keyword) {
      return { status: false, message: "Keyword is required", data: null };
    }
    return await this.service.findAll({
      search: keyword,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
  }

  // ---------------------- WRITE HELPERS (with transaction) ----------------------
  async updateStatus(params, queryRunner) {
    const { id, status, errorMessage = null } = params;
    if (!id || !status) {
      return {
        status: false,
        message: "ID and status are required",
        data: null,
      };
    }
    return await this.service.updateStatus(
      id,
      status,
      errorMessage,
      "system",
      queryRunner,
    );
  }

  async retryFailed(params, queryRunner) {
    const { id } = params;
    if (!id)
      return {
        status: false,
        message: "Notification ID is required",
        data: null,
      };

    const notification = await this.service.findById(id, true);
    if (!notification)
      return { status: false, message: "Notification not found", data: null };

    if (![LOG_STATUS.FAILED, LOG_STATUS.QUEUED].includes(notification.status)) {
      return {
        status: false,
        message: `Cannot retry notification with status: ${notification.status}`,
      };
    }

    const updates = {
      status: LOG_STATUS.SENT,
      retry_count: (notification.retry_count || 0) + 1,
      sent_at: new Date(),
      error_message: null,
      last_error_at: null,
    };
    const updated = await this.service.update(
      id,
      updates,
      "system",
      queryRunner,
    );
    return { status: true, data: updated, sendResult: { success: true } };
  }

  async retryAllFailed(params, queryRunner) {
    const { filters = {} } = params;
    const result = await this.service.findAll({
      status: [LOG_STATUS.FAILED, LOG_STATUS.QUEUED], // array – service must support it
      recipient_email: filters.recipient_email,
      limit: 1000,
      includeDeleted: false,
    });
    const failedNotifications = result.data;

    const results = [];
    for (const notif of failedNotifications) {
      try {
        const updates = {
          status: LOG_STATUS.SENT,
          retry_count: (notif.retry_count || 0) + 1,
          sent_at: new Date(),
          error_message: null,
          last_error_at: null,
        };
        await this.service.update(notif.id, updates, "system", queryRunner);
        results.push({ id: notif.id, success: true });
      } catch (err) {
        results.push({ id: notif.id, success: false, error: err.message });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    return {
      status: true,
      message: `Retried ${results.length} notifications. ${successCount} succeeded.`,
      data: results,
    };
  }

  async resend(params, queryRunner) {
    const { id } = params;
    if (!id)
      return {
        status: false,
        message: "Notification ID is required",
        data: null,
      };

    const notification = await this.service.findById(id, true);
    if (!notification)
      return { status: false, message: "Notification not found", data: null };

    const updates = {
      status: LOG_STATUS.RESEND,
      resend_count: (notification.resend_count || 0) + 1,
      sent_at: new Date(),
      error_message: null,
      last_error_at: null,
    };
    const updated = await this.service.update(
      id,
      updates,
      "system",
      queryRunner,
    );
    return { status: true, data: updated, sendResult: { success: true } };
  }

  // ---------------------- TRANSACTION WRAPPER ----------------------
  async runInTransaction(handlerFn, params, event) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await handlerFn(params, queryRunner);
      if (result?.status) {
        await queryRunner.commitTransaction();
        await this.logActivity(
          event,
          params.method || "unknown",
          "Operation completed",
        ).catch((err) => {
          this.logger.warn("Failed to log activity:", err);
        });
      } else {
        await queryRunner.rollbackTransaction();
      }
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async logActivity(event, action, description) {
    const userId = event?.sender?.userId || null;
    if (!userId) return;
    const logEntry = this.auditLogRepo.create({
      user: userId,
      action,
      description,
      entity: "NotificationLog",
      timestamp: new Date(),
    });
    await this.auditLogRepo.save(logEntry);
  }
}

const handler = new NotificationLogHandler();
ipcMain.handle(
  "notificationLog",
  withErrorHandling(handler.handleRequest.bind(handler), "IPC:notificationLog"),
);
module.exports = { NotificationLogHandler, notificationHandler: handler };
