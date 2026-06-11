// services/DebtHistoryService.js
// Refactored to follow the same structure as DebtService, BorrowerService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class DebtHistoryService {
  constructor() {
    this.debtHistoryRepository = null;
    this.debtRepository = null;
    this.paymentRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const DebtHistory = require("../entities/DebtHistory");
    const Debt = require("../entities/Debt");
    const Payment = require("../entities/Payment");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.debtHistoryRepository = AppDataSource.getRepository(DebtHistory);
    this.debtRepository = AppDataSource.getRepository(Debt);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    console.log("DebtHistoryService initialized");
  }

  async getRepositories() {
    if (!this.debtHistoryRepository) {
      await this.initialize();
    }
    return {
      debtHistory: this.debtHistoryRepository,
      debt: this.debtRepository,
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
    console.log(`[DebtHistory._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[DebtHistory._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new debt history entry (immutable log)
   * @param {Object} data - { debtId, paymentId?, transactionType, transactionDate, amount?, description?, oldValue?, newValue? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const DebtHistory = require("../entities/DebtHistory");
    const Debt = require("../entities/Debt");
    const Payment = require("../entities/Payment");

    const historyRepo = this._getRepo(qr, DebtHistory);
    const debtRepo = this._getRepo(qr, Debt);
    const paymentRepo = this._getRepo(qr, Payment);

    try {
      if (!data.debtId) throw new Error("debtId is required");
      if (!data.transactionType) throw new Error("transactionType is required");
      if (!data.transactionDate) throw new Error("transactionDate is required");

      const debt = await debtRepo.findOne({ where: { id: data.debtId } });
      if (!debt) throw new Error(`Debt with ID ${data.debtId} not found`);

      let payment = null;
      if (data.paymentId) {
        payment = await paymentRepo.findOne({ where: { id: data.paymentId } });
        if (!payment) throw new Error(`Payment with ID ${data.paymentId} not found`);
      }

      const historyData = {
        debt,
        payment,
        transactionType: data.transactionType,
        transactionDate: new Date(data.transactionDate),
        amount: data.amount ?? null,
        description: data.description ?? null,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        createdAt: new Date(),
        // updatedAt may not exist; if entity has it, add here
      };

      const history = historyRepo.create(historyData);
      const saved = await saveDb(historyRepo, history, { queryRunner: qr });
      await auditLogger.logCreate("DebtHistory", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create debt history:", error.message);
      throw error;
    }
  }

  /**
   * Update a debt history entry (generally not recommended, but allowed for corrections)
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const DebtHistory = require("../entities/DebtHistory");
    const Debt = require("../entities/Debt");
    const Payment = require("../entities/Payment");

    const historyRepo = this._getRepo(qr, DebtHistory);
    const debtRepo = this._getRepo(qr, Debt);
    const paymentRepo = this._getRepo(qr, Payment);

    try {
      const existing = await historyRepo.findOne({
        where: { id, deletedAt: null },
        relations: ["debt", "payment"],
      });
      if (!existing) throw new Error(`DebtHistory with ID ${id} not found`);

      const oldData = { ...existing };

      if (data.debtId !== undefined) {
        const debt = await debtRepo.findOne({ where: { id: data.debtId } });
        if (!debt) throw new Error(`Debt with ID ${data.debtId} not found`);
        existing.debt = debt;
        delete data.debtId;
      }
      if (data.paymentId !== undefined) {
        if (data.paymentId === null) {
          existing.payment = null;
        } else {
          const payment = await paymentRepo.findOne({ where: { id: data.paymentId } });
          if (!payment) throw new Error(`Payment with ID ${data.paymentId} not found`);
          existing.payment = payment;
        }
        delete data.paymentId;
      }
      if (data.transactionDate) {
        data.transactionDate = new Date(data.transactionDate);
      }

      Object.assign(existing, data);
      if (existing.updatedAt !== undefined) existing.updatedAt = new Date();

      const saved = await updateDb(historyRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("DebtHistory", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update debt history:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a debt history entry (if entity supports deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const DebtHistory = require("../entities/DebtHistory");
    const historyRepo = this._getRepo(qr, DebtHistory);

    try {
      const history = await historyRepo.findOne({ where: { id, deletedAt: null } });
      if (!history) throw new Error(`DebtHistory with ID ${id} not found`);
      if (history.deletedAt) throw new Error(`DebtHistory #${id} is already deleted`);

      const oldData = { ...history };
      history.deletedAt = new Date();
      if (history.updatedAt !== undefined) history.updatedAt = new Date();

      const saved = await updateDb(historyRepo, history, { queryRunner: qr });
      await auditLogger.logDelete("DebtHistory", id, oldData, user);
      console.log(`DebtHistory soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete debt history:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted debt history entry
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const DebtHistory = require("../entities/DebtHistory");
    const historyRepo = this._getRepo(qr, DebtHistory);

    try {
      const history = await historyRepo.findOne({ where: { id }, withDeleted: true });
      if (!history) throw new Error(`DebtHistory with ID ${id} not found`);
      if (!history.deletedAt) throw new Error(`DebtHistory #${id} is not deleted`);

      history.deletedAt = null;
      if (history.updatedAt !== undefined) history.updatedAt = new Date();

      const saved = await updateDb(historyRepo, history, { queryRunner: qr });
      await auditLogger.logUpdate("DebtHistory", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`DebtHistory restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore debt history:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a debt history entry
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const DebtHistory = require("../entities/DebtHistory");
    const historyRepo = this._getRepo(qr, DebtHistory);

    const history = await historyRepo.findOne({ where: { id }, withDeleted: true });
    if (!history) throw new Error(`DebtHistory with ID ${id} not found`);

    await removeDb(historyRepo, history);
    await auditLogger.logDelete("DebtHistory", id, history, user);
    console.log(`DebtHistory #${id} permanently deleted`);
  }

  /**
   * Find debt history by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const { debtHistory: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("history")
      .leftJoinAndSelect("history.debt", "debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "debtSession")
      .leftJoinAndSelect("history.payment", "payment")
      .leftJoinAndSelect("payment.worker", "paymentWorker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "paymentSession")
      .where("history.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("history.deletedAt IS NULL");
    }

    const history = await qb.getOne();
    if (!history) throw new Error(`DebtHistory with ID ${id} not found`);

    await auditLogger.logView("DebtHistory", id, "system");
    return history;
  }

  /**
   * Find all debt history entries with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { debtHistory: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("history")
      .leftJoinAndSelect("history.debt", "debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "debtSession")
      .leftJoinAndSelect("history.payment", "payment")
      .leftJoinAndSelect("payment.worker", "paymentWorker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "paymentSession");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("history.deletedAt IS NULL");
    }

    // Filters
    if (options.debtId) {
      qb.andWhere("debt.id = :debtId", { debtId: options.debtId });
    }
    if (options.paymentId) {
      qb.andWhere("payment.id = :paymentId", { paymentId: options.paymentId });
    }
    if (options.transactionType) {
      qb.andWhere("history.transactionType = :transactionType", { transactionType: options.transactionType });
    }
    if (options.startDate) {
      qb.andWhere("history.transactionDate >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      qb.andWhere("history.transactionDate <= :endDate", { endDate: new Date(options.endDate) });
    }
    if (options.minAmount) {
      qb.andWhere("history.amount >= :minAmount", { minAmount: options.minAmount });
    }
    if (options.maxAmount) {
      qb.andWhere("history.amount <= :maxAmount", { maxAmount: options.maxAmount });
    }

    // Sorting
    const sortBy = options.sortBy || "transactionDate";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`history.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("DebtHistory", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get debt history statistics
   */
  async getStatistics() {
    const { debtHistory: repo } = await this.getRepositories();
    const qb = repo.createQueryBuilder("history").where("history.deletedAt IS NULL");

    const totalEntries = await qb.getCount();
    const totalPayments = await qb.clone().andWhere("history.transactionType = :type", { type: "payment" }).getCount();
    const totalAdjustments = await qb.clone().andWhere("history.transactionType = :type", { type: "adjustment" }).getCount();
    const totalForgiveness = await qb.clone().andWhere("history.transactionType = :type", { type: "forgiveness" }).getCount();

    const totalAmountSum = await qb.clone().select("SUM(history.amount)", "sum").getRawOne();
    const totalAmount = parseFloat(totalAmountSum.sum) || 0;

    return {
      totalEntries,
      totalPayments,
      totalAdjustments,
      totalForgiveness,
      totalAmount,
    };
  }

  /**
   * Export debt history to CSV or JSON
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
        "ID", "Debt ID", "Debt Name", "Worker Name", "Payment ID", "Transaction Type",
        "Transaction Date", "Amount", "Description", "Old Value", "New Value",
        "Created At"
      ];
      const rows = histories.map((h) => [
        h.id,
        h.debt?.id ?? "",
        h.debt?.name ?? "",
        h.debt?.worker?.name ?? "",
        h.payment?.id ?? "",
        h.transactionType,
        new Date(h.transactionDate).toLocaleDateString(),
        h.amount ?? "",
        h.description ?? "",
        h.oldValue ?? "",
        h.newValue ?? "",
        new Date(h.createdAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `debt_history_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: histories,
        filename: `debt_history_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("DebtHistory", format, filters, user);
    console.log(`Exported ${histories.length} debt history entries in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create debt history entries
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
   * Bulk update debt history entries
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
   * Import debt history from CSV file
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
          debtId: parseInt(record.debtId, 10),
          paymentId: record.paymentId ? parseInt(record.paymentId, 10) : null,
          transactionType: record.transactionType,
          transactionDate: record.transactionDate,
          amount: record.amount ? parseFloat(record.amount) : null,
          description: record.description || null,
          oldValue: record.oldValue || null,
          newValue: record.newValue || null,
        };
        if (!historyData.debtId) throw new Error("debtId is required");
        if (!historyData.transactionType) throw new Error("transactionType is required");
        if (!historyData.transactionDate) throw new Error("transactionDate is required");
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
const debtHistoryService = new DebtHistoryService();
module.exports = debtHistoryService;