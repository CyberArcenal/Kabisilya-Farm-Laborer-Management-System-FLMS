// services/SessionService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class SessionService {
  constructor() {
    this.sessionRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Session = require("../entities/Session");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.sessionRepository = AppDataSource.getRepository(Session);
    console.log("SessionService initialized");
  }

  async getRepository() {
    if (!this.sessionRepository) {
      await this.initialize();
    }
    return this.sessionRepository;
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
    console.log(`[Session._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[Session._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new session
   * @param {Object} data - { name, year, startDate, endDate?, seasonType?, status? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Session = require("../entities/Session");
    const repo = this._getRepo(qr, Session);

    try {
      if (!data.name) throw new Error("Session name is required");
      if (!data.year) throw new Error("year is required");
      if (!data.startDate) throw new Error("startDate is required");

      // Optional: check for duplicate name+year if desired
      // const existing = await repo.findOne({ where: { name: data.name, year: data.year, deletedAt: null } });
      // if (existing) throw new Error(`Session "${data.name}" for year ${data.year} already exists`);

      const sessionData = {
        name: data.name,
        year: data.year,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        seasonType: data.seasonType || null,
        status: data.status || "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const session = repo.create(sessionData);
      const saved = await saveDb(repo, session, { queryRunner: qr });
      await auditLogger.logCreate("Session", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create session:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing session
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Session = require("../entities/Session");
    const repo = this._getRepo(qr, Session);

    try {
      const existing = await repo.findOne({ where: { id, deletedAt: null } });
      if (!existing) throw new Error(`Session with ID ${id} not found`);

      const oldData = { ...existing };

      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Session", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update session:", error.message);
      throw error;
    }
  }

  /**
   * Update session status with validation of allowed transitions
   * @param {number} id
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Session = require("../entities/Session");
    const repo = this._getRepo(qr, Session);

    const session = await repo.findOne({ where: { id, deletedAt: null } });
    if (!session) throw new Error(`Session with ID ${id} not found`);

    const oldStatus = session.status;
    if (oldStatus === newStatus) return session;

    const allowedTransitions = {
      active: ["closed", "archived"],
      closed: ["active", "archived"],
      archived: [],
    };

    if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    session.status = newStatus;
    session.updatedAt = new Date();

    const saved = await updateDb(repo, session, { queryRunner: qr });
    await auditLogger.logUpdate("Session", id, { status: oldStatus }, { status: newStatus }, user);
    return saved;
  }

  /**
   * Soft delete a session (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Session = require("../entities/Session");
    const repo = this._getRepo(qr, Session);

    try {
      const session = await repo.findOne({ where: { id, deletedAt: null } });
      if (!session) throw new Error(`Session with ID ${id} not found`);
      if (session.deletedAt) throw new Error(`Session #${id} is already deleted`);

      const oldData = { ...session };
      session.deletedAt = new Date();
      session.updatedAt = new Date();

      const saved = await updateDb(repo, session, { queryRunner: qr });
      await auditLogger.logDelete("Session", id, oldData, user);
      console.log(`Session soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete session:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted session
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Session = require("../entities/Session");
    const repo = this._getRepo(qr, Session);

    try {
      const session = await repo.findOne({ where: { id }, withDeleted: true });
      if (!session) throw new Error(`Session with ID ${id} not found`);
      if (!session.deletedAt) throw new Error(`Session #${id} is not deleted`);

      session.deletedAt = null;
      session.updatedAt = new Date();

      const saved = await updateDb(repo, session, { queryRunner: qr });
      await auditLogger.logUpdate("Session", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`Session restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore session:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a session (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Session = require("../entities/Session");
    const repo = this._getRepo(qr, Session);

    const session = await repo.findOne({ where: { id }, withDeleted: true });
    if (!session) throw new Error(`Session with ID ${id} not found`);

    await removeDb(repo, session);
    await auditLogger.logDelete("Session", id, session, user);
    console.log(`Session #${id} permanently deleted`);
  }

  /**
   * Find session by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const repo = await this.getRepository();

    const qb = repo
      .createQueryBuilder("session")
      .leftJoinAndSelect("session.bukids", "bukids")
      .leftJoinAndSelect("session.assignments", "assignments")
      .leftJoinAndSelect("session.payments", "payments")
      .leftJoinAndSelect("session.debts", "debts")
      .where("session.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("session.deletedAt IS NULL");
    }

    const session = await qb.getOne();
    if (!session) throw new Error(`Session with ID ${id} not found`);

    await auditLogger.logView("Session", id, "system");
    return session;
  }

  /**
   * Find all sessions with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("session");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("session.deletedAt IS NULL");
    }

    // Filters
    if (options.status) {
      qb.andWhere("session.status = :status", { status: options.status });
    }
    if (options.year) {
      qb.andWhere("session.year = :year", { year: options.year });
    }
    if (options.seasonType) {
      qb.andWhere("session.seasonType = :seasonType", { seasonType: options.seasonType });
    }
    if (options.startDateFrom) {
      qb.andWhere("session.startDate >= :startDateFrom", { startDateFrom: new Date(options.startDateFrom) });
    }
    if (options.startDateTo) {
      qb.andWhere("session.startDate <= :startDateTo", { startDateTo: new Date(options.startDateTo) });
    }
    if (options.search) {
      qb.andWhere("(session.name LIKE :search OR session.seasonType LIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    // Sorting
    const sortBy = options.sortBy || "startDate";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`session.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Session", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get session statistics
   */
  async getStatistics() {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("session").where("session.deletedAt IS NULL");

    const total = await qb.getCount();
    const active = await qb.clone().andWhere("session.status = :status", { status: "active" }).getCount();
    const closed = await qb.clone().andWhere("session.status = :status", { status: "closed" }).getCount();
    const archived = await qb.clone().andWhere("session.status = :status", { status: "archived" }).getCount();

    // Year breakdown
    const yearCounts = await qb
      .clone()
      .select("session.year", "year")
      .addSelect("COUNT(*)", "count")
      .groupBy("session.year")
      .getRawMany();

    return {
      total,
      active,
      closed,
      archived,
      byYear: yearCounts.reduce((acc, row) => {
        acc[row.year] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  }

  /**
   * Export sessions to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportSessions(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const sessions = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Name", "Year", "Start Date", "End Date", "Season Type", "Status",
        "Created At", "Updated At"
      ];
      const rows = sessions.map((s) => [
        s.id,
        s.name,
        s.year,
        new Date(s.startDate).toLocaleDateString(),
        s.endDate ? new Date(s.endDate).toLocaleDateString() : "",
        s.seasonType ?? "",
        s.status,
        new Date(s.createdAt).toLocaleDateString(),
        new Date(s.updatedAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `sessions_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: sessions,
        filename: `sessions_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("Session", format, filters, user);
    console.log(`Exported ${sessions.length} sessions in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create sessions
   * @param {Array<Object>} sessionsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(sessionsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of sessionsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ session: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update sessions
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
   * Import sessions from CSV file
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
        const sessionData = {
          name: record.name,
          year: record.year ? parseInt(record.year, 10) : null,
          startDate: record.startDate,
          endDate: record.endDate || null,
          seasonType: record.seasonType || null,
          status: record.status || "active",
        };
        if (!sessionData.name) throw new Error("name is required");
        if (!sessionData.year) throw new Error("year is required");
        if (!sessionData.startDate) throw new Error("startDate is required");
        const saved = await this.create(sessionData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const sessionService = new SessionService();
module.exports = sessionService;