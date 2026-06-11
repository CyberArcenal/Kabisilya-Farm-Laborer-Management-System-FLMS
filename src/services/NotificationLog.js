// services/NotificationLogService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

// Status constants
const LOG_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  RESEND: "resend",
};

class NotificationLogService {
  constructor() {
    this.notificationLogRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const NotificationLog = require("../entities/NotificationLog");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.notificationLogRepository = AppDataSource.getRepository(NotificationLog);
    console.log("NotificationLogService initialized");
  }

  async getRepository() {
    if (!this.notificationLogRepository) {
      await this.initialize();
    }
    return this.notificationLogRepository;
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const qrType = qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    console.log(`[NotificationLog._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[NotificationLog._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new notification log entry
   * @param {Object} data - { to, subject, payload?, status?, errorMessage? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    try {
      if (!data.to) throw new Error("recipient (to) is required");
      if (!data.subject) throw new Error("subject is required");

      const logData = {
        recipient_email: data.to,
        subject: data.subject,
        payload: data.payload || null,
        status: data.status || LOG_STATUS.QUEUED,
        error_message: data.errorMessage || null,
        retry_count: data.retryCount || 0,
        resend_count: data.resendCount || 0,
        sent_at: data.status === LOG_STATUS.SENT ? new Date() : null,
        last_error_at: data.status === LOG_STATUS.FAILED ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const log = repo.create(logData);
      const saved = await saveDb(repo, log, { queryRunner: qr });
      await auditLogger.logCreate("NotificationLog", saved.id, saved, user);
      console.log(`NotificationLog created for ${data.to}: ${data.subject}`);
      return saved;
    } catch (error) {
      console.error("Failed to create notification log:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing notification log entry
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    try {
      const existing = await repo.findOne({ where: { id, deletedAt: null } });
      if (!existing) throw new Error(`NotificationLog with ID ${id} not found`);

      const oldData = { ...existing };

      // Automatic timestamp updates based on status
      if (data.status === LOG_STATUS.SENT && existing.status !== LOG_STATUS.SENT) {
        data.sent_at = new Date();
      }
      if (data.status === LOG_STATUS.FAILED && existing.status !== LOG_STATUS.FAILED) {
        data.last_error_at = new Date();
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("NotificationLog", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update notification log:", error.message);
      throw error;
    }
  }

  /**
   * Update the status of a notification log and optionally set error message
   * @param {number} id
   * @param {string} status
   * @param {string|null} errorMessage
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateStatus(id, status, errorMessage = null, user = "system", qr = null) {
    const updates = { status };
    if (errorMessage !== null) updates.error_message = errorMessage;
    return this.update(id, updates, user, qr);
  }

  /**
   * Soft delete a notification log (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    try {
      const log = await repo.findOne({ where: { id, deletedAt: null } });
      if (!log) throw new Error(`NotificationLog with ID ${id} not found`);
      if (log.deletedAt) throw new Error(`NotificationLog #${id} is already deleted`);

      const oldData = { ...log };
      log.deletedAt = new Date();
      log.updatedAt = new Date();

      const saved = await updateDb(repo, log, { queryRunner: qr });
      await auditLogger.logDelete("NotificationLog", id, oldData, user);
      console.log(`NotificationLog soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete notification log:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted notification log
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    try {
      const log = await repo.findOne({ where: { id }, withDeleted: true });
      if (!log) throw new Error(`NotificationLog with ID ${id} not found`);
      if (!log.deletedAt) throw new Error(`NotificationLog #${id} is not deleted`);

      log.deletedAt = null;
      log.updatedAt = new Date();

      const saved = await updateDb(repo, log, { queryRunner: qr });
      await auditLogger.logUpdate("NotificationLog", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`NotificationLog restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore notification log:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a notification log (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const log = await repo.findOne({ where: { id }, withDeleted: true });
    if (!log) throw new Error(`NotificationLog with ID ${id} not found`);

    await removeDb(repo, log);
    await auditLogger.logDelete("NotificationLog", id, log, user);
    console.log(`NotificationLog #${id} permanently deleted`);
  }

  /**
   * Find notification log by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const repo = await this.getRepository();

    const qb = repo.createQueryBuilder("log").where("log.id = :id", { id });
    if (!includeDeleted) {
      qb.andWhere("log.deletedAt IS NULL");
    }

    const log = await qb.getOne();
    if (!log) throw new Error(`NotificationLog with ID ${id} not found`);

    await auditLogger.logView("NotificationLog", id, "system");
    return log;
  }

  /**
   * Find all notification logs with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("log");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("log.deletedAt IS NULL");
    }

    // Filters
    if (options.recipient_email) {
      qb.andWhere("log.recipient_email = :recipient", { recipient: options.recipient_email });
    }
    if (options.status) {
      qb.andWhere("log.status = :status", { status: options.status });
    }
    if (options.startDate) {
      qb.andWhere("log.createdAt >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      qb.andWhere("log.createdAt <= :endDate", { endDate: new Date(options.endDate) });
    }
    if (options.search) {
      qb.andWhere(
        "(log.recipient_email LIKE :search OR log.subject LIKE :search OR log.payload LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`log.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("NotificationLog", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get notification log statistics
   * @param {Object} filters - { startDate?, endDate? }
   */
  async getStatistics(filters = {}) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("log").where("log.deletedAt IS NULL");

    if (filters.startDate) {
      qb.andWhere("log.createdAt >= :startDate", { startDate: new Date(filters.startDate) });
    }
    if (filters.endDate) {
      qb.andWhere("log.createdAt <= :endDate", { endDate: new Date(filters.endDate) });
    }

    const total = await qb.getCount();
    const queued = await qb.clone().andWhere("log.status = :status", { status: LOG_STATUS.QUEUED }).getCount();
    const sent = await qb.clone().andWhere("log.status = :status", { status: LOG_STATUS.SENT }).getCount();
    const failed = await qb.clone().andWhere("log.status = :status", { status: LOG_STATUS.FAILED }).getCount();
    const resent = await qb.clone().andWhere("log.status = :status", { status: LOG_STATUS.RESEND }).getCount();

    // Average retry count for failed notifications
    const avgRetryResult = await qb
      .clone()
      .where("log.status = :status", { status: LOG_STATUS.FAILED })
      .select("AVG(log.retry_count)", "avg")
      .getRawOne();
    const avgRetryFailed = parseFloat(avgRetryResult?.avg) || 0;

    // Last 24 hours count
    const last24h = await qb
      .clone()
      .where("log.createdAt >= :date", { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getCount();

    return {
      total,
      queued,
      sent,
      failed,
      resent,
      avgRetryFailed,
      last24h,
    };
  }

  /**
   * Export notification logs to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportLogs(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const logs = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Recipient Email", "Subject", "Payload", "Status",
        "Error Message", "Retry Count", "Resend Count", "Sent At",
        "Last Error At", "Created At", "Updated At"
      ];
      const rows = logs.map((l) => [
        l.id,
        l.recipient_email,
        l.subject,
        l.payload ?? "",
        l.status,
        l.error_message ?? "",
        l.retry_count,
        l.resend_count,
        l.sent_at ? new Date(l.sent_at).toLocaleString() : "",
        l.last_error_at ? new Date(l.last_error_at).toLocaleString() : "",
        new Date(l.createdAt).toLocaleString(),
        new Date(l.updatedAt).toLocaleString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `notification_logs_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: logs,
        filename: `notification_logs_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("NotificationLog", format, filters, user);
    console.log(`Exported ${logs.length} notification logs in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create notification logs
   * @param {Array<Object>} logsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(logsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of logsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ log: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update notification logs
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        const saved = await this.update(id, updates, user, qr);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, updates, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import notification logs from CSV file
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async importFromCSV(filePath, user = "system", qr = null) {
    const fs = require("fs").promises;
    const csv = require("csv-parse/sync");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { imported: [], errors: [] };
    for (const record of records) {
      try {
        const logData = {
          to: record.recipient_email,
          subject: record.subject,
          payload: record.payload || null,
          status: record.status || LOG_STATUS.QUEUED,
          errorMessage: record.error_message || null,
          retryCount: record.retry_count ? parseInt(record.retry_count, 10) : 0,
          resendCount: record.resend_count ? parseInt(record.resend_count, 10) : 0,
        };
        if (!logData.to) throw new Error("recipient_email is required");
        if (!logData.subject) throw new Error("subject is required");
        const saved = await this.create(logData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const notificationLogService = new NotificationLogService();
module.exports = { notificationLogService, LOG_STATUS, NotificationLogService };