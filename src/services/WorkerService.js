// services/WorkerService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class WorkerService {
  constructor() {
    this.workerRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Worker = require("../entities/Worker");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.workerRepository = AppDataSource.getRepository(Worker);
    console.log("WorkerService initialized");
  }

  async getRepository() {
    if (!this.workerRepository) {
      await this.initialize();
    }
    return this.workerRepository;
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
    console.log(`[Worker._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[Worker._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new worker
   * @param {Object} data - { name, email?, contact?, address?, status? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Worker = require("../entities/Worker");
    const repo = this._getRepo(qr, Worker);

    try {
      if (!data.name) throw new Error("Worker name is required");

      // Email uniqueness check
      if (data.email) {
        const existing = await repo.findOne({ where: { email: data.email, deletedAt: null } });
        if (existing) throw new Error(`Worker with email "${data.email}" already exists`);
      }

      // Contact uniqueness check (if provided)
      if (data.contact) {
        const existing = await repo.findOne({ where: { contact: data.contact, deletedAt: null } });
        if (existing) throw new Error(`Worker with contact "${data.contact}" already exists`);
      }

      const workerData = {
        name: data.name,
        email: data.email || null,
        contact: data.contact || null,
        address: data.address || null,
        status: data.status || "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const worker = repo.create(workerData);
      const saved = await saveDb(repo, worker, { queryRunner: qr });
      await auditLogger.logCreate("Worker", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create worker:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing worker
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Worker = require("../entities/Worker");
    const repo = this._getRepo(qr, Worker);

    try {
      const existing = await repo.findOne({ where: { id, deletedAt: null } });
      if (!existing) throw new Error(`Worker with ID ${id} not found`);

      const oldData = { ...existing };

      // Email uniqueness if changed
      if (data.email && data.email !== existing.email) {
        const emailExists = await repo.findOne({ where: { email: data.email, deletedAt: null } });
        if (emailExists) throw new Error(`Worker with email "${data.email}" already exists`);
      }

      // Contact uniqueness if changed
      if (data.contact && data.contact !== existing.contact) {
        const contactExists = await repo.findOne({ where: { contact: data.contact, deletedAt: null } });
        if (contactExists) throw new Error(`Worker with contact "${data.contact}" already exists`);
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Worker", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update worker:", error.message);
      throw error;
    }
  }

  /**
   * Update worker status with validation of allowed transitions
   * @param {number} id
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Worker = require("../entities/Worker");
    const repo = this._getRepo(qr, Worker);

    const worker = await repo.findOne({ where: { id, deletedAt: null } });
    if (!worker) throw new Error(`Worker with ID ${id} not found`);

    const oldStatus = worker.status;
    if (oldStatus === newStatus) return worker;

    const allowedTransitions = {
      active: ["inactive", "on-leave", "terminated"],
      inactive: ["active", "terminated"],
      "on-leave": ["active", "terminated"],
      terminated: [],
    };

    if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    worker.status = newStatus;
    worker.updatedAt = new Date();

    const saved = await updateDb(repo, worker, { queryRunner: qr });
    await auditLogger.logUpdate("Worker", id, { status: oldStatus }, { status: newStatus }, user);
    return saved;
  }

  /**
   * Soft delete a worker (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Worker = require("../entities/Worker");
    const repo = this._getRepo(qr, Worker);

    try {
      const worker = await repo.findOne({ where: { id, deletedAt: null } });
      if (!worker) throw new Error(`Worker with ID ${id} not found`);
      if (worker.deletedAt) throw new Error(`Worker #${id} is already deleted`);

      const oldData = { ...worker };
      worker.deletedAt = new Date();
      worker.updatedAt = new Date();

      const saved = await updateDb(repo, worker, { queryRunner: qr });
      await auditLogger.logDelete("Worker", id, oldData, user);
      console.log(`Worker soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete worker:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted worker
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Worker = require("../entities/Worker");
    const repo = this._getRepo(qr, Worker);

    try {
      const worker = await repo.findOne({ where: { id }, withDeleted: true });
      if (!worker) throw new Error(`Worker with ID ${id} not found`);
      if (!worker.deletedAt) throw new Error(`Worker #${id} is not deleted`);

      worker.deletedAt = null;
      worker.updatedAt = new Date();

      const saved = await updateDb(repo, worker, { queryRunner: qr });
      await auditLogger.logUpdate("Worker", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`Worker restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore worker:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a worker (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Worker = require("../entities/Worker");
    const repo = this._getRepo(qr, Worker);

    const worker = await repo.findOne({ where: { id }, withDeleted: true });
    if (!worker) throw new Error(`Worker with ID ${id} not found`);

    await removeDb(repo, worker);
    await auditLogger.logDelete("Worker", id, worker, user);
    console.log(`Worker #${id} permanently deleted`);
  }

  /**
   * Find worker by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const repo = await this.getRepository();

    const qb = repo
      .createQueryBuilder("worker")
      .leftJoinAndSelect("worker.debts", "debts")
      .leftJoinAndSelect("worker.payments", "payments")
      .leftJoinAndSelect("worker.assignments", "assignments")
      .where("worker.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("worker.deletedAt IS NULL");
    }

    const worker = await qb.getOne();
    if (!worker) throw new Error(`Worker with ID ${id} not found`);

    await auditLogger.logView("Worker", id, "system");
    return worker;
  }

  /**
   * Find all workers with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("worker");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("worker.deletedAt IS NULL");
    }

    // Filters
    if (options.status) {
      qb.andWhere("worker.status = :status", { status: options.status });
    }
    if (options.search) {
      qb.andWhere(
        "(worker.name LIKE :search OR worker.email LIKE :search OR worker.contact LIKE :search OR worker.address LIKE :search)",
        { search: `%${options.search}%` }
      );
    }
    if (options.email) {
      qb.andWhere("worker.email = :email", { email: options.email });
    }
    if (options.contact) {
      qb.andWhere("worker.contact = :contact", { contact: options.contact });
    }

    // Sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`worker.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Worker", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get worker statistics
   */
  async getStatistics() {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("worker").where("worker.deletedAt IS NULL");

    const total = await qb.getCount();
    const active = await qb.clone().andWhere("worker.status = :status", { status: "active" }).getCount();
    const inactive = await qb.clone().andWhere("worker.status = :status", { status: "inactive" }).getCount();
    const onLeave = await qb.clone().andWhere("worker.status = :status", { status: "on-leave" }).getCount();
    const terminated = await qb.clone().andWhere("worker.status = :status", { status: "terminated" }).getCount();

    const withEmail = await qb.clone().andWhere("worker.email IS NOT NULL").getCount();
    const withContact = await qb.clone().andWhere("worker.contact IS NOT NULL").getCount();

    return {
      total,
      active,
      inactive,
      onLeave,
      terminated,
      withEmail,
      withContact,
    };
  }

  /**
   * Export workers to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportWorkers(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const workers = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Name", "Email", "Contact", "Address", "Status",
        "Created At", "Updated At"
      ];
      const rows = workers.map((w) => [
        w.id,
        w.name,
        w.email ?? "",
        w.contact ?? "",
        w.address ?? "",
        w.status,
        new Date(w.createdAt).toLocaleDateString(),
        new Date(w.updatedAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `workers_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: workers,
        filename: `workers_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("Worker", format, filters, user);
    console.log(`Exported ${workers.length} workers in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create workers
   * @param {Array<Object>} workersArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(workersArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of workersArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ worker: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update workers
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
   * Import workers from CSV file
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
        const workerData = {
          name: record.name,
          email: record.email || null,
          contact: record.contact || null,
          address: record.address || null,
          status: record.status || "active",
        };
        if (!workerData.name) throw new Error("name is required");
        const saved = await this.create(workerData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const workerService = new WorkerService();
module.exports = workerService;