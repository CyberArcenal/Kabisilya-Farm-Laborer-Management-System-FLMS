// services/NotificationService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class NotificationService {
  constructor() {
    this.notificationRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Notification = require("../entities/Notification");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.notificationRepository = AppDataSource.getRepository(Notification);
    console.log("NotificationService initialized");
  }

  async getRepository() {
    if (!this.notificationRepository) {
      await this.initialize();
    }
    return this.notificationRepository;
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
    console.log(`[Notification._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[Notification._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new notification
   * @param {Object} data - { userId, title, message, type?, metadata?, scheduledFor? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      if (!data.title) throw new Error("title is required");
      if (!data.message) throw new Error("message is required");

      const notificationData = {
        title: data.title,
        message: data.message,
        type: data.type || "info",
        userId: data.userId || null,
        metadata: data.metadata || null,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const notification = repo.create(notificationData);
      const saved = await saveDb(repo, notification, { queryRunner: qr });
      await auditLogger.logCreate("Notification", saved.id, saved, user);
      console.log(`Notification created: ${data.title}`);
      return saved;
    } catch (error) {
      console.error("Failed to create notification:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing notification (e.g., mark as read, modify message)
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const existing = await repo.findOne({ where: { id, deletedAt: null } });
      if (!existing) throw new Error(`Notification with ID ${id} not found`);

      const oldData = { ...existing };

      if (data.scheduledFor) {
        data.scheduledFor = new Date(data.scheduledFor);
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Notification", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update notification:", error.message);
      throw error;
    }
  }

  /**
   * Mark a single notification as read (or unread)
   * @param {number} id
   * @param {boolean} isRead
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async markAsRead(id, isRead = true, user = "system", qr = null) {
    return this.update(id, { isRead }, user, qr);
  }

  /**
   * Mark all notifications as read (for a specific user if userId provided)
   * @param {number|null} userId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async markAllAsRead(userId = null, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const qb = repo.createQueryBuilder("notification").where("isRead = :isRead", { isRead: false });
    if (userId) {
      qb.andWhere("userId = :userId", { userId });
    }

    const result = await qb.update().set({ isRead: true, updatedAt: new Date() }).execute();
    const count = result.affected || 0;

    if (count > 0) {
      await auditLogger.logUpdate("Notification", null, { isRead: false }, { isRead: true }, user);
      console.log(`Marked ${count} notifications as read`);
    }
    return count;
  }

  /**
   * Soft delete a notification (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const notification = await repo.findOne({ where: { id, deletedAt: null } });
      if (!notification) throw new Error(`Notification with ID ${id} not found`);
      if (notification.deletedAt) throw new Error(`Notification #${id} is already deleted`);

      const oldData = { ...notification };
      notification.deletedAt = new Date();
      notification.updatedAt = new Date();

      const saved = await updateDb(repo, notification, { queryRunner: qr });
      await auditLogger.logDelete("Notification", id, oldData, user);
      console.log(`Notification soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete notification:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted notification
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const notification = await repo.findOne({ where: { id }, withDeleted: true });
      if (!notification) throw new Error(`Notification with ID ${id} not found`);
      if (!notification.deletedAt) throw new Error(`Notification #${id} is not deleted`);

      notification.deletedAt = null;
      notification.updatedAt = new Date();

      const saved = await updateDb(repo, notification, { queryRunner: qr });
      await auditLogger.logUpdate("Notification", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`Notification restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore notification:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a notification (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const notification = await repo.findOne({ where: { id }, withDeleted: true });
    if (!notification) throw new Error(`Notification with ID ${id} not found`);

    await removeDb(repo, notification);
    await auditLogger.logDelete("Notification", id, notification, user);
    console.log(`Notification #${id} permanently deleted`);
  }

  /**
   * Find notification by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const repo = await this.getRepository();

    const qb = repo.createQueryBuilder("notification").where("notification.id = :id", { id });
    if (!includeDeleted) {
      qb.andWhere("notification.deletedAt IS NULL");
    }

    const notification = await qb.getOne();
    if (!notification) throw new Error(`Notification with ID ${id} not found`);

    await auditLogger.logView("Notification", id, "system");
    return notification;
  }

  /**
   * Find all notifications with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("notification");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("notification.deletedAt IS NULL");
    }

    // Filters
    if (options.userId) {
      qb.andWhere("notification.userId = :userId", { userId: options.userId });
    }
    if (options.isRead !== undefined) {
      qb.andWhere("notification.isRead = :isRead", { isRead: options.isRead });
    }
    if (options.type) {
      qb.andWhere("notification.type = :type", { type: options.type });
    }
    if (options.startDate) {
      qb.andWhere("notification.createdAt >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      qb.andWhere("notification.createdAt <= :endDate", { endDate: new Date(options.endDate) });
    }
    if (options.search) {
      qb.andWhere("(notification.title LIKE :search OR notification.message LIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    // Sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`notification.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Notification", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get notification statistics
   * @param {number|null} userId
   */
  async getStatistics(userId = null) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("notification").where("notification.deletedAt IS NULL");

    if (userId) {
      qb.andWhere("notification.userId = :userId", { userId });
    }

    const total = await qb.getCount();
    const unread = await qb.clone().andWhere("notification.isRead = :isRead", { isRead: false }).getCount();
    const read = total - unread;

    // Count by type
    const typeCounts = await qb
      .clone()
      .select("notification.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("notification.type")
      .getRawMany();

    return {
      total,
      unread,
      read,
      byType: typeCounts.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  }

  /**
   * Get unread count for a user
   * @param {number|null} userId
   */
  async getUnreadCount(userId = null) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("notification")
      .where("notification.isRead = :isRead", { isRead: false })
      .andWhere("notification.deletedAt IS NULL");

    if (userId) {
      qb.andWhere("notification.userId = :userId", { userId });
    }
    return qb.getCount();
  }

  /**
   * Export notifications to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportNotifications(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const notifications = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Title", "Message", "Type", "User ID", "Is Read",
        "Metadata", "Scheduled For", "Created At", "Updated At"
      ];
      const rows = notifications.map((n) => [
        n.id,
        n.title,
        n.message,
        n.type,
        n.userId ?? "",
        n.isRead ? "Yes" : "No",
        n.metadata ? JSON.stringify(n.metadata) : "",
        n.scheduledFor ? new Date(n.scheduledFor).toLocaleDateString() : "",
        new Date(n.createdAt).toLocaleDateString(),
        new Date(n.updatedAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `notifications_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: notifications,
        filename: `notifications_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("Notification", format, filters, user);
    console.log(`Exported ${notifications.length} notifications in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create notifications
   * @param {Array<Object>} notificationsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(notificationsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of notificationsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ notification: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update notifications
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
   * Import notifications from CSV file
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
        const notificationData = {
          title: record.title,
          message: record.message,
          type: record.type || "info",
          userId: record.userId ? parseInt(record.userId, 10) : null,
          isRead: record.isRead === "Yes" || record.isRead === "true",
          scheduledFor: record.scheduledFor || null,
          metadata: record.metadata ? JSON.parse(record.metadata) : null,
        };
        if (!notificationData.title) throw new Error("title is required");
        if (!notificationData.message) throw new Error("message is required");
        const saved = await this.create(notificationData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;