// services/PitakService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.

const auditLogger = require("../utils/auditLogger");
const { farmSessionDefaultSessionId } = require("../utils/settings/system");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class PitakService {
  constructor() {
    this.pitakRepository = null;
    this.bukidRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Pitak = require("../entities/Pitak");
    const Bukid = require("../entities/Bukid");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.pitakRepository = AppDataSource.getRepository(Pitak);
    this.bukidRepository = AppDataSource.getRepository(Bukid);
    console.log("PitakService initialized");
  }

  async getRepositories() {
    if (!this.pitakRepository) {
      await this.initialize();
    }
    return {
      pitak: this.pitakRepository,
      bukid: this.bukidRepository,
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
    console.log(`[Pitak._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[Pitak._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Auto-generate a unique location name like "Plot-1", "Plot-2", etc.
   * @param {number} bukidId
   * @param {import("typeorm").QueryRunner|null} qr
   */
  async _generateLocation(bukidId, qr = null) {
    const Pitak = require("../entities/Pitak");
    const repo = this._getRepo(qr, Pitak);
    const count = await repo.count({
      where: { bukid: { id: bukidId }, deletedAt: null },
    });
    return `Plot-${count + 1}`;
  }

  /**
   * Create a new pitak
   * @param {Object} data - { bukidId, location?, description?, area?, status? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Pitak = require("../entities/Pitak");
    const Bukid = require("../entities/Bukid");

    const pitakRepo = this._getRepo(qr, Pitak);
    const bukidRepo = this._getRepo(qr, Bukid);

    try {
      if (!data.bukidId) throw new Error("bukidId is required");

      const bukid = await bukidRepo.findOne({ where: { id: data.bukidId, deletedAt: null } });
      if (!bukid) throw new Error(`Bukid with ID ${data.bukidId} not found`);

      // Auto-generate location if not provided
      let location = data.location;
      if (!location || location.trim() === "") {
        location = await this._generateLocation(data.bukidId, qr);
      }

      // Check uniqueness of (bukid, location) among active pitaks
      const existing = await pitakRepo.findOne({
        where: {
          bukid: { id: data.bukidId },
          location,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new Error(`A pitak with location "${location}" already exists in this bukid`);
      }

      const pitakData = {
        bukid,
        location,
        description: data.description || null,
        area: data.area || null,
        status: data.status || "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pitak = pitakRepo.create(pitakData);
      const saved = await saveDb(pitakRepo, pitak, { queryRunner: qr });
      await auditLogger.logCreate("Pitak", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create pitak:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing pitak
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Pitak = require("../entities/Pitak");
    const Bukid = require("../entities/Bukid");

    const pitakRepo = this._getRepo(qr, Pitak);
    const bukidRepo = this._getRepo(qr, Bukid);

    try {
      const existing = await pitakRepo.findOne({
        where: { id, deletedAt: null },
        relations: ["bukid"],
      });
      if (!existing) throw new Error(`Pitak with ID ${id} not found`);

      const oldData = { ...existing };

      if (data.bukidId !== undefined) {
        const bukid = await bukidRepo.findOne({ where: { id: data.bukidId, deletedAt: null } });
        if (!bukid) throw new Error(`Bukid with ID ${data.bukidId} not found`);
        existing.bukid = bukid;
        delete data.bukidId;
      }

      // If location or bukid changed, check uniqueness
      const newLocation = data.location !== undefined ? data.location : existing.location;
      const newBukid = data.bukidId !== undefined ? existing.bukid : existing.bukid;
      if ((data.location !== undefined && data.location !== existing.location) || data.bukidId !== undefined) {
        const duplicate = await pitakRepo.findOne({
          where: {
            bukid: { id: newBukid.id },
            location: newLocation,
            deletedAt: null,
          },
        });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`A pitak with location "${newLocation}" already exists in this bukid`);
        }
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(pitakRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Pitak", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update pitak:", error.message);
      throw error;
    }
  }

  /**
   * Update pitak status with validation of allowed transitions
   * @param {number} id
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Pitak = require("../entities/Pitak");
    const pitakRepo = this._getRepo(qr, Pitak);

    const pitak = await pitakRepo.findOne({ where: { id, deletedAt: null } });
    if (!pitak) throw new Error(`Pitak with ID ${id} not found`);

    const oldStatus = pitak.status;
    if (oldStatus === newStatus) return pitak;

    const allowedTransitions = {
      active: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    pitak.status = newStatus;
    pitak.updatedAt = new Date();

    const saved = await updateDb(pitakRepo, pitak, { queryRunner: qr });
    await auditLogger.logUpdate("Pitak", id, { status: oldStatus }, { status: newStatus }, user);
    return saved;
  }

  /**
   * Soft delete a pitak (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Pitak = require("../entities/Pitak");
    const pitakRepo = this._getRepo(qr, Pitak);

    try {
      const pitak = await pitakRepo.findOne({ where: { id, deletedAt: null } });
      if (!pitak) throw new Error(`Pitak with ID ${id} not found`);
      if (pitak.deletedAt) throw new Error(`Pitak #${id} is already deleted`);

      const oldData = { ...pitak };
      pitak.deletedAt = new Date();
      pitak.updatedAt = new Date();

      const saved = await updateDb(pitakRepo, pitak, { queryRunner: qr });
      await auditLogger.logDelete("Pitak", id, oldData, user);
      console.log(`Pitak soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete pitak:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted pitak
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Pitak = require("../entities/Pitak");
    const pitakRepo = this._getRepo(qr, Pitak);

    try {
      const pitak = await pitakRepo.findOne({ where: { id }, withDeleted: true });
      if (!pitak) throw new Error(`Pitak with ID ${id} not found`);
      if (!pitak.deletedAt) throw new Error(`Pitak #${id} is not deleted`);

      pitak.deletedAt = null;
      pitak.updatedAt = new Date();

      const saved = await updateDb(pitakRepo, pitak, { queryRunner: qr });
      await auditLogger.logUpdate("Pitak", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`Pitak restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore pitak:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a pitak (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Pitak = require("../entities/Pitak");
    const pitakRepo = this._getRepo(qr, Pitak);

    const pitak = await pitakRepo.findOne({ where: { id }, withDeleted: true });
    if (!pitak) throw new Error(`Pitak with ID ${id} not found`);

    await removeDb(pitakRepo, pitak);
    await auditLogger.logDelete("Pitak", id, pitak, user);
    console.log(`Pitak #${id} permanently deleted`);
  }

  /**
   * Find pitak by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const { pitak: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session")
      .leftJoinAndSelect("pitak.assignments", "assignments")
      .leftJoinAndSelect("pitak.payments", "payments")
      .where("pitak.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("pitak.deletedAt IS NULL");
    }

    const pitak = await qb.getOne();
    if (!pitak) throw new Error(`Pitak with ID ${id} not found`);

    // Enforce current session (pitak belongs to bukid which belongs to session)
    const defaultSessionId = await farmSessionDefaultSessionId();
    if (!defaultSessionId) {
      throw new Error("No default session set. Cannot access pitak.");
    }
    if (pitak.bukid?.session?.id !== defaultSessionId) {
      throw new Error(`Pitak #${id} does not belong to the current session`);
    }

    await auditLogger.logView("Pitak", id, "system");
    return pitak;
  }

  /**
   * Find all pitaks with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { pitak: repo } = await this.getRepositories();
    const qb = repo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("pitak.deletedAt IS NULL");
    }

    // Apply default session if none provided
    let sessionId = options.sessionId;
    if (!sessionId) {
      sessionId = await farmSessionDefaultSessionId();
      if (!sessionId) {
        console.warn("No default session ID available for Pitak.findAll");
        return { data: [], pagination: { page: options.page || 1, limit: options.limit || 10, total: 0, pages: 0 } };
      }
    }

    // Filters
    if (sessionId) {
      qb.andWhere("session.id = :sessionId", { sessionId });
    }
    if (options.bukidId) {
      qb.andWhere("bukid.id = :bukidId", { bukidId: options.bukidId });
    }
    if (options.status) {
      qb.andWhere("pitak.status = :status", { status: options.status });
    }
    if (options.search) {
      qb.andWhere("(pitak.location LIKE :search OR pitak.description LIKE :search)", {
        search: `%${options.search}%`,
      });
    }
    if (options.minArea) {
      qb.andWhere("pitak.area >= :minArea", { minArea: options.minArea });
    }
    if (options.maxArea) {
      qb.andWhere("pitak.area <= :maxArea", { maxArea: options.maxArea });
    }

    // Sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`pitak.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Pitak", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get pitak statistics
   */
  async getStatistics() {
    const { pitak: repo } = await this.getRepositories();
    const qb = repo.createQueryBuilder("pitak").where("pitak.deletedAt IS NULL");

    const total = await qb.getCount();
    const active = await qb.clone().andWhere("pitak.status = :status", { status: "active" }).getCount();
    const completed = await qb.clone().andWhere("pitak.status = :status", { status: "completed" }).getCount();
    const cancelled = await qb.clone().andWhere("pitak.status = :status", { status: "cancelled" }).getCount();

    const totalAreaSum = await qb.clone().select("SUM(pitak.area)", "sum").getRawOne();
    const totalArea = parseFloat(totalAreaSum.sum) || 0;

    return {
      total,
      active,
      completed,
      cancelled,
      totalArea,
    };
  }

  /**
   * Export pitaks to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportPitaks(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const pitaks = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Location", "Description", "Area", "Status",
        "Bukid ID", "Bukid Name", "Session ID", "Created At", "Updated At"
      ];
      const rows = pitaks.map((p) => [
        p.id,
        p.location,
        p.description ?? "",
        p.area ?? "",
        p.status,
        p.bukid?.id ?? "",
        p.bukid?.name ?? "",
        p.bukid?.session?.id ?? "",
        new Date(p.createdAt).toLocaleDateString(),
        new Date(p.updatedAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `pitaks_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: pitaks,
        filename: `pitaks_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("Pitak", format, filters, user);
    console.log(`Exported ${pitaks.length} pitaks in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create pitaks
   * @param {Array<Object>} pitaksArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(pitaksArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of pitaksArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ pitak: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update pitaks
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
   * Import pitaks from CSV file
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
        const pitakData = {
          bukidId: parseInt(record.bukidId, 10),
          location: record.location || null,
          description: record.description || null,
          area: record.area ? parseFloat(record.area) : null,
          status: record.status || "active",
        };
        if (!pitakData.bukidId) throw new Error("bukidId is required");
        const saved = await this.create(pitakData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const pitakService = new PitakService();
module.exports = pitakService;