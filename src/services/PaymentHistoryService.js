// services/PaymentHistoryService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class PaymentHistoryService {
  constructor() {
    this.paymentHistoryRepository = null;
    this.paymentRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const PaymentHistory = require("../entities/PaymentHistory");
    const Payment = require("../entities/Payment");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.paymentHistoryRepository = AppDataSource.getRepository(PaymentHistory);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    console.log("PaymentHistoryService initialized");
  }

  async getRepositories() {
    if (!this.paymentHistoryRepository) {
      await this.initialize();
    }
    return {
      paymentHistory: this.paymentHistoryRepository,
      payment: this.paymentRepository,
    };
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
    console.log(`[PaymentHistory._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[PaymentHistory._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new payment history entry (immutable log)
   * @param {Object} data - { paymentId, actionType, changeDate, oldValue?, newValue?, description? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const PaymentHistory = require("../entities/PaymentHistory");
    const Payment = require("../entities/Payment");

    const historyRepo = this._getRepo(qr, PaymentHistory);
    const paymentRepo = this._getRepo(qr, Payment);

    try {
      if (!data.paymentId) throw new Error("paymentId is required");
      if (!data.actionType) throw new Error("actionType is required");
      if (!data.changeDate) throw new Error("changeDate is required");

      const payment = await paymentRepo.findOne({ where: { id: data.paymentId, deletedAt: null } });
      if (!payment) throw new Error(`Payment with ID ${data.paymentId} not found`);

      const historyData = {
        payment,
        actionType: data.actionType,
        changeDate: new Date(data.changeDate),
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        description: data.description ?? null,
        createdAt: new Date(),
        // PaymentHistory entity may not have updatedAt; if it does, add here
      };

      const history = historyRepo.create(historyData);
      const saved = await saveDb(historyRepo, history, { queryRunner: qr });
      await auditLogger.logCreate("PaymentHistory", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create payment history:", error.message);
      throw error;
    }
  }

  /**
   * Update a payment history entry (generally not recommended, but allowed for corrections)
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const PaymentHistory = require("../entities/PaymentHistory");
    const Payment = require("../entities/Payment");

    const historyRepo = this._getRepo(qr, PaymentHistory);
    const paymentRepo = this._getRepo(qr, Payment);

    try {
      const existing = await historyRepo.findOne({
        where: { id, deletedAt: null },
        relations: ["payment"],
      });
      if (!existing) throw new Error(`PaymentHistory with ID ${id} not found`);

      const oldData = { ...existing };

      if (data.paymentId !== undefined) {
        const payment = await paymentRepo.findOne({ where: { id: data.paymentId, deletedAt: null } });
        if (!payment) throw new Error(`Payment with ID ${data.paymentId} not found`);
        existing.payment = payment;
        delete data.paymentId;
      }
      if (data.changeDate) {
        data.changeDate = new Date(data.changeDate);
      }

      Object.assign(existing, data);
      if (existing.updatedAt !== undefined) existing.updatedAt = new Date();

      const saved = await updateDb(historyRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("PaymentHistory", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update payment history:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a payment history entry (if entity supports deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const PaymentHistory = require("../entities/PaymentHistory");
    const historyRepo = this._getRepo(qr, PaymentHistory);

    try {
      const history = await historyRepo.findOne({ where: { id, deletedAt: null } });
      if (!history) throw new Error(`PaymentHistory with ID ${id} not found`);
      if (history.deletedAt) throw new Error(`PaymentHistory #${id} is already deleted`);

      const oldData = { ...history };
      history.deletedAt = new Date();
      if (history.updatedAt !== undefined) history.updatedAt = new Date();

      const saved = await updateDb(historyRepo, history, { queryRunner: qr });
      await auditLogger.logDelete("PaymentHistory", id, oldData, user);
      console.log(`PaymentHistory soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete payment history:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted payment history entry
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const PaymentHistory = require("../entities/PaymentHistory");
    const historyRepo = this._getRepo(qr, PaymentHistory);

    try {
      const history = await historyRepo.findOne({ where: { id }, withDeleted: true });
      if (!history) throw new Error(`PaymentHistory with ID ${id} not found`);
      if (!history.deletedAt) throw new Error(`PaymentHistory #${id} is not deleted`);

      history.deletedAt = null;
      if (history.updatedAt !== undefined) history.updatedAt = new Date();

      const saved = await updateDb(historyRepo, history, { queryRunner: qr });
      await auditLogger.logUpdate("PaymentHistory", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`PaymentHistory restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore payment history:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a payment history entry
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const PaymentHistory = require("../entities/PaymentHistory");
    const historyRepo = this._getRepo(qr, PaymentHistory);

    const history = await historyRepo.findOne({ where: { id }, withDeleted: true });
    if (!history) throw new Error(`PaymentHistory with ID ${id} not found`);

    await removeDb(historyRepo, history);
    await auditLogger.logDelete("PaymentHistory", id, history, user);
    console.log(`PaymentHistory #${id} permanently deleted`);
  }

  /**
   * Find payment history by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const { paymentHistory: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("history")
      .leftJoinAndSelect("history.payment", "payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "session")
      .where("history.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("history.deletedAt IS NULL");
    }

    const history = await qb.getOne();
    if (!history) throw new Error(`PaymentHistory with ID ${id} not found`);

    await auditLogger.logView("PaymentHistory", id, "system");
    return history;
  }

  /**
   * Find all payment history entries with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { paymentHistory: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("history")
      .leftJoinAndSelect("history.payment", "payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "session");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("history.deletedAt IS NULL");
    }

    // Filters
    if (options.paymentId) {
      qb.andWhere("payment.id = :paymentId", { paymentId: options.paymentId });
    }
    if (options.actionType) {
      qb.andWhere("history.actionType = :actionType", { actionType: options.actionType });
    }
    if (options.startDate) {
      qb.andWhere("history.changeDate >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      qb.andWhere("history.changeDate <= :endDate", { endDate: new Date(options.endDate) });
    }
    if (options.descriptionSearch) {
      qb.andWhere("history.description LIKE :desc", { desc: `%${options.descriptionSearch}%` });
    }

    // Sorting
    const sortBy = options.sortBy || "changeDate";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`history.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("PaymentHistory", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get payment history statistics
   * @param {Object} filters - { startDate?, endDate? }
   */
  async getStatistics(filters = {}) {
    const { paymentHistory: repo } = await this.getRepositories();
    const qb = repo.createQueryBuilder("history").where("history.deletedAt IS NULL");

    if (filters.startDate) {
      qb.andWhere("history.changeDate >= :startDate", { startDate: new Date(filters.startDate) });
    }
    if (filters.endDate) {
      qb.andWhere("history.changeDate <= :endDate", { endDate: new Date(filters.endDate) });
    }

    const totalEntries = await qb.getCount();

    // Count by action type
    const actionTypeCounts = await qb
      .clone()
      .select("history.actionType", "actionType")
      .addSelect("COUNT(*)", "count")
      .groupBy("history.actionType")
      .getRawMany();

    const byActionType = actionTypeCounts.reduce((acc, row) => {
      acc[row.actionType] = parseInt(row.count, 10);
      return acc;
    }, {});

    return {
      totalEntries,
      byActionType,
    };
  }

  /**
   * Export payment history to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportHistory(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const histories = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Payment ID", "Worker Name", "Pitak Name", "Action Type",
        "Change Date", "Old Value", "New Value", "Description", "Created At"
      ];
      const rows = histories.map((h) => [
        h.id,
        h.payment?.id ?? "",
        h.payment?.worker?.name ?? "",
        h.payment?.pitak?.name ?? "",
        h.actionType,
        new Date(h.changeDate).toLocaleString(),
        h.oldValue ?? "",
        h.newValue ?? "",
        h.description ?? "",
        new Date(h.createdAt).toLocaleString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `payment_history_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: histories,
        filename: `payment_history_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("PaymentHistory", format, filters, user);
    console.log(`Exported ${histories.length} payment history entries in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create payment history entries
   * @param {Array<Object>} historiesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(historiesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of historiesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ history: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update payment history entries
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
   * Import payment history from CSV file
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
        const historyData = {
          paymentId: parseInt(record.paymentId, 10),
          actionType: record.actionType,
          changeDate: record.changeDate,
          oldValue: record.oldValue || null,
          newValue: record.newValue || null,
          description: record.description || null,
        };
        if (!historyData.paymentId) throw new Error("paymentId is required");
        if (!historyData.actionType) throw new Error("actionType is required");
        if (!historyData.changeDate) throw new Error("changeDate is required");
        const saved = await this.create(historyData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const paymentHistoryService = new PaymentHistoryService();
module.exports = paymentHistoryService;