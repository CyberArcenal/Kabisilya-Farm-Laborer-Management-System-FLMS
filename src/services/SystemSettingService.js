// services/SystemSettingService.js
// Refactored to follow the same structure as DebtService, AssignmentService, etc.

const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

class SystemSettingService {
  constructor() {
    this.systemSettingRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const { SystemSetting } = require("../entities/systemSettings");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.systemSettingRepository = AppDataSource.getRepository(SystemSetting);
    console.log("SystemSettingService initialized");
  }

  async getRepository() {
    if (!this.systemSettingRepository) {
      await this.initialize();
    }
    return this.systemSettingRepository;
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
    console.log(`[SystemSetting._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/datasource");
    console.log(`[SystemSetting._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new system setting
   * @param {Object} data - { key, value, setting_type, description?, is_public? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    try {
      if (!data.key) throw new Error("key is required");
      if (!data.value) throw new Error("value is required");
      if (!data.setting_type) throw new Error("setting_type is required");

      // Check uniqueness of (setting_type, key) among non-deleted records
      const existing = await repo.findOne({
        where: {
          setting_type: data.setting_type,
          key: data.key,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new Error(`Setting with type "${data.setting_type}" and key "${data.key}" already exists`);
      }

      const settingData = {
        key: data.key,
        value: data.value,
        setting_type: data.setting_type,
        description: data.description || null,
        is_public: data.is_public !== undefined ? data.is_public : false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const setting = repo.create(settingData);
      const saved = await saveDb(repo, setting, { queryRunner: qr });
      await auditLogger.logCreate("SystemSetting", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create system setting:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing system setting
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    try {
      const existing = await repo.findOne({ where: { id, deletedAt: null } });
      if (!existing) throw new Error(`SystemSetting with ID ${id} not found`);

      const oldData = { ...existing };

      // If setting_type or key changed, check uniqueness
      const newType = data.setting_type !== undefined ? data.setting_type : existing.setting_type;
      const newKey = data.key !== undefined ? data.key : existing.key;
      if ((data.setting_type !== undefined && data.setting_type !== existing.setting_type) ||
          (data.key !== undefined && data.key !== existing.key)) {
        const duplicate = await repo.findOne({
          where: {
            setting_type: newType,
            key: newKey,
            deletedAt: null,
          },
        });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Setting with type "${newType}" and key "${newKey}" already exists`);
        }
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("SystemSetting", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update system setting:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a system setting (set deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    try {
      const setting = await repo.findOne({ where: { id, deletedAt: null } });
      if (!setting) throw new Error(`SystemSetting with ID ${id} not found`);
      if (setting.deletedAt) throw new Error(`SystemSetting #${id} is already deleted`);

      const oldData = { ...setting };
      setting.deletedAt = new Date();
      setting.updatedAt = new Date();

      const saved = await updateDb(repo, setting, { queryRunner: qr });
      await auditLogger.logDelete("SystemSetting", id, oldData, user);
      console.log(`SystemSetting soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete system setting:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted system setting
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    try {
      const setting = await repo.findOne({ where: { id }, withDeleted: true });
      if (!setting) throw new Error(`SystemSetting with ID ${id} not found`);
      if (!setting.deletedAt) throw new Error(`SystemSetting #${id} is not deleted`);

      setting.deletedAt = null;
      setting.updatedAt = new Date();

      const saved = await updateDb(repo, setting, { queryRunner: qr });
      await auditLogger.logUpdate("SystemSetting", id, { deletedAt: true }, { deletedAt: null }, user);
      console.log(`SystemSetting restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore system setting:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a system setting (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    const setting = await repo.findOne({ where: { id }, withDeleted: true });
    if (!setting) throw new Error(`SystemSetting with ID ${id} not found`);

    await removeDb(repo, setting);
    await auditLogger.logDelete("SystemSetting", id, setting, user);
    console.log(`SystemSetting #${id} permanently deleted`);
  }

  /**
   * Find system setting by ID (excludes soft-deleted by default)
   * @param {number} id
   * @param {boolean} includeDeleted
   */
  async findById(id, includeDeleted = false) {
    const repo = await this.getRepository();

    const qb = repo.createQueryBuilder("setting").where("setting.id = :id", { id });
    if (!includeDeleted) {
      qb.andWhere("setting.deletedAt IS NULL");
    }

    const setting = await qb.getOne();
    if (!setting) throw new Error(`SystemSetting with ID ${id} not found`);

    await auditLogger.logView("SystemSetting", id, "system");
    return setting;
  }

  /**
   * Find all system settings with filters, pagination, sorting
   * @param {Object} options
   */
  async findAll(options = {}) {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("setting");

    // Exclude soft-deleted unless requested
    if (!options.includeDeleted) {
      qb.andWhere("setting.deletedAt IS NULL");
    }

    // Filters
    if (options.setting_type) {
      qb.andWhere("setting.setting_type = :setting_type", { setting_type: options.setting_type });
    }
    if (options.key) {
      qb.andWhere("setting.key = :key", { key: options.key });
    }
    if (options.is_public !== undefined) {
      qb.andWhere("setting.is_public = :is_public", { is_public: options.is_public });
    }
    if (options.search) {
      qb.andWhere(
        "(setting.key LIKE :search OR setting.value LIKE :search OR setting.description LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`setting.${sortBy}`, sortOrder);

    // Pagination using utility
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("SystemSetting", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get system setting statistics
   */
  async getStatistics() {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder("setting").where("setting.deletedAt IS NULL");

    const total = await qb.getCount();
    const publicCount = await qb.clone().andWhere("setting.is_public = :is_public", { is_public: true }).getCount();
    const privateCount = total - publicCount;

    // Count by setting_type
    const typeCounts = await qb
      .clone()
      .select("setting.setting_type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("setting.setting_type")
      .getRawMany();

    return {
      total,
      public: publicCount,
      private: privateCount,
      byType: typeCounts.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  }

  /**
   * Export system settings to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   */
  async exportSettings(format = "json", filters = {}, user = "system") {
    const result = await this.findAll(filters);
    const settings = result.data;

    let exportData;
    if (format === "csv") {
      const headers = [
        "ID", "Key", "Value", "Setting Type", "Description", "Is Public",
        "Created At", "Updated At"
      ];
      const rows = settings.map((s) => [
        s.id,
        s.key,
        s.value,
        s.setting_type,
        s.description ?? "",
        s.is_public ? "Yes" : "No",
        new Date(s.createdAt).toLocaleString(),
        new Date(s.updatedAt).toLocaleString(),
      ]);
      exportData = {
        format: "csv",
        data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
        filename: `system_settings_export_${new Date().toISOString().split("T")[0]}.csv`,
      };
    } else {
      exportData = {
        format: "json",
        data: settings,
        filename: `system_settings_export_${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    await auditLogger.logExport("SystemSetting", format, filters, user);
    console.log(`Exported ${settings.length} system settings in ${format} format`);
    return exportData;
  }

  /**
   * Bulk create system settings
   * @param {Array<Object>} settingsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(settingsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of settingsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ setting: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update system settings
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
   * Import system settings from CSV file
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
        const settingData = {
          key: record.key,
          value: record.value,
          setting_type: record.setting_type,
          description: record.description || null,
          is_public: record.is_public === "Yes" || record.is_public === "true",
        };
        if (!settingData.key) throw new Error("key is required");
        if (!settingData.value) throw new Error("value is required");
        if (!settingData.setting_type) throw new Error("setting_type is required");
        const saved = await this.create(settingData, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }

  /**
   * Helper: get a single setting value by type and key
   * @param {string} setting_type
   * @param {string} key
   * @param {any} defaultValue
   */
  async getValue(setting_type, key, defaultValue = null) {
    const repo = await this.getRepository();
    const setting = await repo.findOne({
      where: { setting_type, key, deletedAt: null },
    });
    return setting ? setting.value : defaultValue;
  }

  /**
   * Helper: set a setting value (upsert by type+key)
   * @param {string} setting_type
   * @param {string} key
   * @param {any} value
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async setValue(setting_type, key, value, user = "system", qr = null) {
    const repo = await this.getRepository();
    const existing = await repo.findOne({
      where: { setting_type, key, deletedAt: null },
    });
    if (existing) {
      return this.update(existing.id, { value }, user, qr);
    } else {
      return this.create({ setting_type, key, value }, user, qr);
    }
  }
}

// Singleton instance
const systemSettingService = new SystemSettingService();
module.exports = systemSettingService;