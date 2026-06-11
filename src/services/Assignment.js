// services/AssignmentService.js
// Refactored to follow the same structure as DebtService and BorrowerService

const auditLogger = require("../utils/auditLogger");
const { AssignmentStatus } = require("../entities/Assignment");
const { farmSessionDefaultSessionId } = require("../utils/settings/system");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class AssignmentService {
  constructor() {
    this.assignmentRepository = null;
    this.workerRepository = null;
    this.pitakRepository = null;
    this.sessionRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Assignment = require("../entities/Assignment");
    const Worker = require("../entities/Worker");
    const Pitak = require("../entities/Pitak");
    const Session = require("../entities/Session");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.assignmentRepository = AppDataSource.getRepository(Assignment);
    this.workerRepository = AppDataSource.getRepository(Worker);
    this.pitakRepository = AppDataSource.getRepository(Pitak);
    this.sessionRepository = AppDataSource.getRepository(Session);
    console.log("AssignmentService initialized");
  }

  async getRepositories() {
    if (!this.assignmentRepository) {
      await this.initialize();
    }
    return {
      assignment: this.assignmentRepository,
      worker: this.workerRepository,
      pitak: this.pitakRepository,
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
    console.log(`[Assignment._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[Assignment._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new assignment
   * @param {Object} data - { workerId, pitakId, sessionId, assignmentDate, notes? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Assignment = require("../entities/Assignment");
    const Worker = require("../entities/Worker");
    const Pitak = require("../entities/Pitak");
    const Session = require("../entities/Session");

    const assignmentRepo = this._getRepo(qr, Assignment);
    const workerRepo = this._getRepo(qr, Worker);
    const pitakRepo = this._getRepo(qr, Pitak);
    const sessionRepo = this._getRepo(qr, Session);

    try {
      // Validate required fields
      if (!data.workerId) throw new Error("workerId is required");
      if (!data.pitakId) throw new Error("pitakId is required");
      if (!data.sessionId) throw new Error("sessionId is required");
      if (!data.assignmentDate) throw new Error("assignmentDate is required");

      // Fetch related entities
      const worker = await workerRepo.findOne({ where: { id: data.workerId } });
      if (!worker) throw new Error(`Worker with ID ${data.workerId} not found`);

      const pitak = await pitakRepo.findOne({ where: { id: data.pitakId } });
      if (!pitak) throw new Error(`Pitak with ID ${data.pitakId} not found`);

      const session = await sessionRepo.findOne({ where: { id: data.sessionId } });
      if (!session) throw new Error(`Session with ID ${data.sessionId} not found`);

      // Check uniqueness (worker + pitak + session) – exclude soft-deleted
      const existing = await assignmentRepo.findOne({
        where: {
          worker: { id: data.workerId },
          pitak: { id: data.pitakId },
          session: { id: data.sessionId },
          deletedAt: null,
        },
      });
      if (existing) {
        throw new Error("An active assignment already exists for this worker, pitak, and session combination");
      }

      // Temporary luwangCount – will be corrected by subscriber
      const luwangCount = 0;

      const assignmentData = {
        worker,
        pitak,
        session,
        luwangCount,
        assignmentDate: data.assignmentDate,
        notes: data.notes || null,
        status: AssignmentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assignment = assignmentRepo.create(assignmentData);
      const saved = await saveDb(assignmentRepo, assignment, { queryRunner: qr });
      await auditLogger.logCreate("Assignment", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create assignment:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing assignment – only notes and assignmentDate allowed
   * @param {number} id
   * @param {Object} data - { notes?, assignmentDate? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Assignment = require("../entities/Assignment");
    const assignmentRepo = this._getRepo(qr, Assignment);

    try {
      const existing = await assignmentRepo.findOne({
        where: { id, deletedAt: null },
        relations: ["worker", "pitak", "session"],
      });
      if (!existing) throw new Error(`Assignment with ID ${id} not found`);

      const oldData = { ...existing };

      // Allowed fields: notes, assignmentDate only
      const allowedUpdates = {
        notes: data.notes,
        assignmentDate: data.assignmentDate,
      };
      Object.keys(allowedUpdates).forEach((key) => {
        if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
      });

      if (Object.keys(allowedUpdates).length === 0) {
        return existing;
      }

      Object.assign(existing, allowedUpdates);
      existing.updatedAt = new Date();

      const saved = await updateDb(assignmentRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Assignment", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update assignment:", error.message);
      throw error;
    }
  }

  /**
   * Update assignment status with validation of allowed transitions
   * @param {number} id
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Assignment = require("../entities/Assignment");
    const assignmentRepo = this._getRepo(qr, Assignment);

    const assignment = await assignmentRepo.findOne({ where: { id, deletedAt: null } });
    if (!assignment) throw new Error(`Assignment with ID ${id} not found`);

    const oldStatus = assignment.status;
    if (oldStatus === newStatus) return assignment;

    // Allowed transitions based on AssignmentStatus enum
    const allowedTransitions = {
      [AssignmentStatus.INITIATED]: [AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED, AssignmentStatus.CANCELLED],
      [AssignmentStatus.ACTIVE]: [AssignmentStatus.COMPLETED, AssignmentStatus.CANCELLED],
      [AssignmentStatus.COMPLETED]: [],
      [AssignmentStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    assignment.status = newStatus;
    assignment.updatedAt = new Date();

    const saved = await updateDb(assignmentRepo, assignment, { queryRunner: qr });
    await auditLogger.logUpdate("Assignment", id, { status: oldStatus }, { status: newStatus }, user);
    return saved;
  }

  /**
   * Soft delete an assignment (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Assignment = require("../entities/Assignment");
    const assignmentRepo = this._getRepo(qr, Assignment);

    try {
      const assignment = await assignmentRepo.findOne({ where: { id, deletedAt: null } });
      if (!assignment) throw new Error(`Assignment with ID ${id} not found`);

      const oldData = { ...assignment };
      assignment.deletedAt = new Date();
      assignment.updatedAt = new Date();

      const saved = await updateDb(assignmentRepo, assignment, { queryRunner: qr });
      await auditLogger.logDelete("Assignment", id, oldData, user);
      console.log(`Assignment soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete assignment:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted assignment
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Assignment = require("../entities/Assignment");
    const assignmentRepo = this._getRepo(qr, Assignment);

    try {
      const assignment = await assignmentRepo.findOne({ where: { id }, withDeleted: true });
      if (!assignment) throw new Error(`Assignment with ID ${id} not found`);
      if (!assignment.deletedAt) throw new Error(`Assignment #${id} is not deleted`);

      assignment.deletedAt = null;
      assignment.updatedAt = new Date();

      const saved = await updateDb(assignmentRepo, assignment, { queryRunner: qr });
      await auditLogger.logUpdate("Assignment", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`Assignment restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore assignment:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete an assignment (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Assignment = require("../entities/Assignment");
    const assignmentRepo = this._getRepo(qr, Assignment);

    const assignment = await assignmentRepo.findOne({ where: { id }, withDeleted: true });
    if (!assignment) throw new Error(`Assignment with ID ${id} not found`);

    await removeDb(assignmentRepo, assignment);
    await auditLogger.logDelete("Assignment", id, assignment, user);
    console.log(`Assignment #${id} permanently deleted`);
  }

  /**
   * Find assignment by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const { assignment: repo } = await this.getRepositories();

    const qb = repo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("assignment.id = :id", { id });

    if (!includeDeleted) {
      qb.andWhere("assignment.deletedAt IS NULL");
    }

    const assignment = await qb.getOne();
    if (!assignment) {
      throw new Error(`Assignment with ID ${id} not found`);
    }

    // Enforce current session
    const defaultSessionId = await farmSessionDefaultSessionId();
    if (!defaultSessionId) {
      throw new Error("No default session set. Cannot access assignment.");
    }
    if (assignment.session?.id !== defaultSessionId) {
      throw new Error(`Assignment #${id} does not belong to the current session`);
    }

    await auditLogger.logView("Assignment", id, "system");
    return assignment;
  }

  /**
   * Find all assignments with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { assignment: repo } = await this.getRepositories();
    const qb = repo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("assignment.deletedAt IS NULL");
    }

    // Apply default session if none provided
    let sessionId = options.sessionId;
    if (!sessionId) {
      sessionId = await farmSessionDefaultSessionId();
      if (!sessionId) {
        console.warn("No default session ID available for Assignment.findAll");
        return { data: [], pagination: { page: options.page || 1, limit: options.limit || 10, total: 0, pages: 0 } };
      }
    }

    // Filters
    if (sessionId) {
      qb.andWhere("session.id = :sessionId", { sessionId });
    }
    if (options.workerId) {
      qb.andWhere("worker.id = :workerId", { workerId: options.workerId });
    }
    if (options.pitakId) {
      qb.andWhere("pitak.id = :pitakId", { pitakId: options.pitakId });
    }
    if (options.status) {
      qb.andWhere("assignment.status = :status", { status: options.status });
    }
    if (options.startDate) {
      qb.andWhere("assignment.assignmentDate >= :startDate", { startDate: options.startDate });
    }
    if (options.endDate) {
      qb.andWhere("assignment.assignmentDate <= :endDate", { endDate: options.endDate });
    }
    if (options.search) {
      qb.andWhere(
        "(worker.name LIKE :search OR pitak.name LIKE :search OR assignment.notes LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    const sortBy = options.sortBy || "assignmentDate";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`assignment.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Assignment", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get assignment statistics
   */
  async getStatistics() {
    const { assignment: repo } = await this.getRepositories();
    const qb = repo.createQueryBuilder("assignment").where("assignment.deletedAt IS NULL");

    const total = await qb.getCount();
    const active = await qb.clone().andWhere("assignment.status = :status", { status: AssignmentStatus.ACTIVE }).getCount();
    const completed = await qb.clone().andWhere("assignment.status = :status", { status: AssignmentStatus.COMPLETED }).getCount();
    const cancelled = await qb.clone().andWhere("assignment.status = :status", { status: AssignmentStatus.CANCELLED }).getCount();
    const initiated = await qb.clone().andWhere("assignment.status = :status", { status: AssignmentStatus.INITIATED }).getCount();

    // Sum of luwangCount (optional)
    const totalLuwangResult = await qb.clone().select("SUM(assignment.luwangCount)", "sum").getRawOne();
    const totalLuwang = parseFloat(totalLuwangResult.sum) || 0;

    return {
      total,
      active,
      completed,
      cancelled,
      initiated,
      totalLuwang,
    };
  }

  /**
   * Export assignments to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportAssignments(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const assignments = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Worker ID", "Worker Name", "Pitak ID", "Pitak Name", "Session ID",
        "Luwang Count", "Assignment Date", "Status", "Notes", "Created At", "Updated At"
      ];
      const rows = assignments.map((a) => [
        a.id,
        a.worker?.id ?? "",
        a.worker?.name ?? "",
        a.pitak?.id ?? "",
        a.pitak?.name ?? "",
        a.session?.id ?? "",
        a.luwangCount ?? 0,
        new Date(a.assignmentDate).toLocaleDateString(),
        a.status,
        a.notes ?? "",
        new Date(a.createdAt).toLocaleDateString(),
        new Date(a.updatedAt).toLocaleDateString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `assignments_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: assignments,
        filename: `assignments_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("Assignment", format, filters, user);
    console.log(`Exported ${assignments.length} assignments in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create assignments
   * @param {Array<Object>} assignmentsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(assignmentsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of assignmentsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ assignment: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update assignments
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
   * Import assignments from CSV file
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
        const assignmentData = {
          workerId: parseInt(record.workerId, 10),
          pitakId: parseInt(record.pitakId, 10),
          sessionId: parseInt(record.sessionId, 10),
          assignmentDate: record.assignmentDate,
          notes: record.notes || null,
        };
        if (!assignmentData.workerId || !assignmentData.pitakId || !assignmentData.sessionId || !assignmentData.assignmentDate) {
          throw new Error("Missing required fields: workerId, pitakId, sessionId, assignmentDate");
        }
        const saved = await this.create(assignmentData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const assignmentService = new AssignmentService();
module.exports = assignmentService;