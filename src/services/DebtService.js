// services/DebtService.js
// Refactored to follow the same structure as AssignmentService, BukidService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class DebtService {
  constructor() {
    this.debtRepository = null;
    this.workerRepository = null;
    this.sessionRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Debt = require("../entities/Debt");
    const Worker = require("../entities/Worker");
    const Session = require("../entities/Session");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.debtRepository = AppDataSource.getRepository(Debt);
    this.workerRepository = AppDataSource.getRepository(Worker);
    this.sessionRepository = AppDataSource.getRepository(Session);
    console.log("DebtService initialized");
  }

  async getRepositories() {
    if (!this.debtRepository) {
      await this.initialize();
    }
    return {
      debt: this.debtRepository,
      worker: this.workerRepository,
      session: this.sessionRepository,
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
    console.log(`[Debt._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[Debt._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new debt
   * @param {Object} data - { workerId, sessionId, amount, dueDate?, description?, status?, originalAmount?, balance? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Debt = require("../entities/Debt");
    const Worker = require("../entities/Worker");
    const Session = require("../entities/Session");

    const debtRepo = this._getRepo(qr, Debt);
    const workerRepo = this._getRepo(qr, Worker);
    const sessionRepo = this._getRepo(qr, Session);

    try {
      if (!data.workerId) throw new Error("workerId is required");
      if (!data.sessionId) throw new Error("sessionId is required");
      if (data.amount === undefined) throw new Error("amount is required");

      const worker = await workerRepo.findOne({ where: { id: data.workerId } });
      if (!worker) throw new Error(`Worker with ID ${data.workerId} not found`);

      const session = await sessionRepo.findOne({ where: { id: data.sessionId } });
      if (!session) throw new Error(`Session with ID ${data.sessionId} not found`);

      const debtData = {
        worker,
        session,
        amount: data.amount,
        originalAmount: data.originalAmount || data.amount,
        balance: data.balance || data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        description: data.description || null,
        status: data.status || "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const debt = debtRepo.create(debtData);
      const saved = await saveDb(debtRepo, debt, { queryRunner: qr });
      await auditLogger.logCreate("Debt", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create debt:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing debt
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Debt = require("../entities/Debt");
    const Worker = require("../entities/Worker");
    const Session = require("../entities/Session");

    const debtRepo = this._getRepo(qr, Debt);
    const workerRepo = this._getRepo(qr, Worker);
    const sessionRepo = this._getRepo(qr, Session);

    try {
      const existing = await debtRepo.findOne({
        where: { id, deletedAt: null },
        relations: ["worker", "session"],
      });
      if (!existing) throw new Error(`Debt with ID ${id} not found`);

      const oldData = { ...existing };

      if (data.workerId !== undefined) {
        const worker = await workerRepo.findOne({ where: { id: data.workerId } });
        if (!worker) throw new Error(`Worker with ID ${data.workerId} not found`);
        existing.worker = worker;
        delete data.workerId;
      }
      if (data.sessionId !== undefined) {
        const session = await sessionRepo.findOne({ where: { id: data.sessionId } });
        if (!session) throw new Error(`Session with ID ${data.sessionId} not found`);
        existing.session = session;
        delete data.sessionId;
      }
      if (data.dueDate) {
        data.dueDate = new Date(data.dueDate);
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(debtRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Debt", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update debt:", error.message);
      throw error;
    }
  }

  /**
   * Update debt status with validation of allowed transitions
   * @param {number} id
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Debt = require("../entities/Debt");
    const debtRepo = this._getRepo(qr, Debt);

    const debt = await debtRepo.findOne({ where: { id, deletedAt: null } });
    if (!debt) throw new Error(`Debt with ID ${id} not found`);

    const oldStatus = debt.status;
    if (oldStatus === newStatus) return debt;

    const allowedTransitions = {
      pending: ["partially_paid", "paid", "cancelled", "overdue"],
      partially_paid: ["paid", "cancelled", "overdue"],
      overdue: ["paid", "cancelled"],
      paid: [],
      cancelled: [],
      settled: [],
    };

    if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    debt.status = newStatus;
    debt.updatedAt = new Date();

    const saved = await updateDb(debtRepo, debt, { queryRunner: qr });
    await auditLogger.logUpdate("Debt", id, { status: oldStatus }, { status: newStatus }, user);
    return saved;
  }

  /**
   * Soft delete a debt (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Debt = require("../entities/Debt");
    const debtRepo = this._getRepo(qr, Debt);

    try {
      const debt = await debtRepo.findOne({ where: { id, deletedAt: null } });
      if (!debt) throw new Error(`Debt with ID ${id} not found`);
      if (debt.deletedAt) throw new Error(`Debt #${id} is already deleted`);

      const oldData = { ...debt };
      debt.deletedAt = new Date();
      debt.updatedAt = new Date();

      const saved = await updateDb(debtRepo, debt, { queryRunner: qr });
      await auditLogger.logDelete("Debt", id, oldData, user);
      console.log(`Debt soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete debt:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted debt
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Debt = require("../entities/Debt");
    const debtRepo = this._getRepo(qr, Debt);

    try {
      const debt = await debtRepo.findOne({ where: { id }, withDeleted: true });
      if (!debt) throw new Error(`Debt with ID ${id} not found`);
      if (!debt.deletedAt) throw new Error(`Debt #${id} is not deleted`);

      debt.deletedAt = null;
      debt.updatedAt = new Date();

      const saved = await updateDb(debtRepo, debt, { queryRunner: qr });
      await auditLogger.logUpdate("Debt", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`Debt restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore debt:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a debt (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Debt = require("../entities/Debt");
    const debtRepo = this._getRepo(qr, Debt);

    const debt = await debtRepo.findOne({ where: { id }, withDeleted: true });
    if (!debt) throw new Error(`Debt with ID ${id} not found`);

    await removeDb(debtRepo, debt);
    await auditLogger.logDelete("Debt", id, debt, user);
    console.log(`Debt #${id} permanently deleted`);
  }

  /**
   * Find debt by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const { debt: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .leftJoinAndSelect("debt.history", "history")
      .where("debt.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("debt.deletedAt IS NULL");
    }

    const debt = await qb.getOne();
    if (!debt) throw new Error(`Debt with ID ${id} not found`);

    await auditLogger.logView("Debt", id, "system");
    return debt;
  }

  /**
   * Find all debts with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { debt: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("debt.deletedAt IS NULL");
    }

    // Filters
    if (options.workerId) {
      qb.andWhere("worker.id = :workerId", { workerId: options.workerId });
    }
    if (options.sessionId) {
      qb.andWhere("session.id = :sessionId", { sessionId: options.sessionId });
    }
    if (options.status) {
      qb.andWhere("debt.status = :status", { status: options.status });
    }
    if (options.dueDateStart) {
      qb.andWhere("debt.dueDate >= :dueDateStart", { dueDateStart: new Date(options.dueDateStart) });
    }
    if (options.dueDateEnd) {
      qb.andWhere("debt.dueDate <= :dueDateEnd", { dueDateEnd: new Date(options.dueDateEnd) });
    }
    if (options.minAmount) {
      qb.andWhere("debt.amount >= :minAmount", { minAmount: options.minAmount });
    }
    if (options.maxAmount) {
      qb.andWhere("debt.amount <= :maxAmount", { maxAmount: options.maxAmount });
    }
    if (options.search) {
      qb.andWhere("(debt.description LIKE :search OR worker.name LIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    // Sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`debt.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Debt", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get debt statistics
   */
  async getStatistics() {
    const { debt: repo } = await this.getRepositories();
    const qb = repo.createQueryBuilder("debt").where("debt.deletedAt IS NULL");

    const total = await qb.getCount();
    const pending = await qb.clone().andWhere("debt.status = :status", { status: "pending" }).getCount();
    const partiallyPaid = await qb.clone().andWhere("debt.status = :status", { status: "partially_paid" }).getCount();
    const paid = await qb.clone().andWhere("debt.status = :status", { status: "paid" }).getCount();
    const overdue = await qb.clone().andWhere("debt.status = :status", { status: "overdue" }).getCount();
    const cancelled = await qb.clone().andWhere("debt.status = :status", { status: "cancelled" }).getCount();

    const totalAmountSum = await qb.clone().select("SUM(debt.amount)", "sum").getRawOne();
    const totalAmount = parseFloat(totalAmountSum.sum) || 0;
    const totalBalanceSum = await qb.clone().select("SUM(debt.balance)", "sum").getRawOne();
    const totalBalance = parseFloat(totalBalanceSum.sum) || 0;

    return {
      total,
      pending,
      partiallyPaid,
      paid,
      overdue,
      cancelled,
      totalAmount,
      totalBalance,
    };
  }

  /**
   * Export debts to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportDebts(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const debts = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Worker ID", "Worker Name", "Session ID", "Amount", "Original Amount",
        "Balance", "Due Date", "Description", "Status", "Created At", "Updated At"
      ];
      const rows = debts.map((d) => [
        d.id,
        d.worker?.id ?? "",
        d.worker?.name ?? "",
        d.session?.id ?? "",
        d.amount,
        d.originalAmount,
        d.balance,
        d.dueDate ? new Date(d.dueDate).toLocaleDateString() : "",
        d.description ?? "",
        d.status,
        new Date(d.createdAt).toLocaleDateString(),
        new Date(d.updatedAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `debts_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: debts,
        filename: `debts_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("Debt", format, filters, user);
    console.log(`Exported ${debts.length} debts in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create debts
   * @param {Array<Object>} debtsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(debtsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of debtsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ debt: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update debts
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
   * Import debts from CSV file
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
        const debtData = {
          workerId: parseInt(record.workerId, 10),
          sessionId: parseInt(record.sessionId, 10),
          amount: parseFloat(record.amount),
          originalAmount: record.originalAmount ? parseFloat(record.originalAmount) : undefined,
          balance: record.balance ? parseFloat(record.balance) : undefined,
          dueDate: record.dueDate || null,
          description: record.description || null,
          status: record.status || "pending",
        };
        if (!debtData.workerId) throw new Error("workerId is required");
        if (!debtData.sessionId) throw new Error("sessionId is required");
        if (isNaN(debtData.amount)) throw new Error("amount must be a number");
        const saved = await this.create(debtData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const debtService = new DebtService();
module.exports = debtService;