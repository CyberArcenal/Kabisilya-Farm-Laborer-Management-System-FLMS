// src/main/services/SystemSettingService.js

const auditLogger = require("../utils/auditLogger");
const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");

class SystemSettingService {
  constructor() {
    this.settingRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const { SystemSetting } = require("../entities/systemSettings");
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    this.settingRepository = AppDataSource.getRepository(SystemSetting);
    console.log("SystemSettingService initialized");
  }

  async getRepositories() {
    if (!this.settingRepository) await this.initialize();
    return { setting: this.settingRepository };
  }

  /**
     * @param {{ manager: { getRepository: (arg0: any) => any; }; } | null} qr
     * @param {string | Function | import("typeorm").EntitySchema<{ id: unknown; key: unknown; value: unknown; setting_type: unknown; description: unknown; is_public: unknown; is_deleted: unknown; created_at: unknown; updated_at: unknown; }> | import("typeorm").EntitySchema<import("typeorm").ObjectLiteral> | { type: import("typeorm").ObjectLiteral; name: string; }} entityClass
     */
  _getRepo(qr, entityClass) {
    // Log the type for debugging
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    console.log(
      `[Global._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    // Only use the transactional manager if qr is a valid QueryRunner object
    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    // Fallback to global data source
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[Global._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
     * @param {null | undefined} value
     */
  _prepareValueForStorage(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  /**
     * @param {unknown} value
     */
  _normalizeOutput(value) {
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
      try {
        const parsed = JSON.parse(value);
        if (
          Array.isArray(parsed) ||
          (typeof parsed === "object" && parsed !== null)
        )
          return parsed;
      } catch {}
    }
    return value;
  }

  // ----------------------------------------------------------------------
  // READ OPERATIONS
  // ----------------------------------------------------------------------

  async getAllSettings(includeDeleted = false) {
    const { setting: repo } = await this.getRepositories();
    const where = includeDeleted ? {} : { is_deleted: false };
    const settings = await repo.find({ where });
    return settings.map((s) => ({
      ...s,
      value: this._normalizeOutput(s.value),
    }));
  }

  async getPublicSettings() {
    const { setting: repo } = await this.getRepositories();
    const settings = await repo.find({
      where: { is_public: true, is_deleted: false },
    });
    return settings.map((s) => ({
      ...s,
      value: this._normalizeOutput(s.value),
    }));
  }

  /**
     * @param {any} settingType
     */
  async getByType(settingType) {
    const { setting: repo } = await this.getRepositories();
    const settings = await repo.find({
      where: { setting_type: settingType, is_deleted: false },
    });
    return settings.map((s) => ({
      ...s,
      value: this._normalizeOutput(s.value),
    }));
  }

  /**
     * @param {any} key
     */
  async getSettingByKey(key, settingType = null) {
    const { setting: repo } = await this.getRepositories();
    const where = { key, is_deleted: false };
    if (settingType) where.setting_type = settingType;
    const setting = await repo.findOne({ where });
    if (!setting) return null;
    return { ...setting, value: this._normalizeOutput(setting.value) };
  }

  /**
     * @param {any} key
     */
  async getValueByKey(key, defaultValue = null) {
    const setting = await this.getSettingByKey(key);
    return setting ? setting.value : defaultValue;
  }

  // ----------------------------------------------------------------------
  // WRITE OPERATIONS
  // ----------------------------------------------------------------------

  /**
     * @param {{ key: any; value: any; setting_type: any; description: any; is_public: any; }} data
     */
  async createSetting(data, user = "system", qr = null) {
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);
    const valueToStore = this._prepareValueForStorage(data.value);
    const setting = repo.create({
      key: data.key,
      value: valueToStore,
      setting_type: data.setting_type,
      description: data.description || null,
      is_public: data.is_public ?? false,
      is_deleted: false,
    });
    const saved = await saveDb(repo, setting, { queryRunner: qr });
    await auditLogger.logCreate("SystemSetting", saved.id, saved, user);
    return { ...saved, value: this._normalizeOutput(saved.value) };
  }

  /**
     * @param {unknown} id
     * @param {{ value: any; key?: any; setting_type?: any; description?: any; is_public?: any; is_deleted?: any; }} data
     */
  async updateSetting(id, data, user = "system", qr = null) {
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);
    const existing = await repo.findOne({ where: { id, is_deleted: false } });
    if (!existing) throw new Error(`Setting with id ${id} not found`);
    const oldData = { ...existing };
    if (data.key !== undefined) existing.key = data.key;
    if (data.value !== undefined)
      existing.value = this._prepareValueForStorage(data.value);
    if (data.setting_type !== undefined)
      existing.setting_type = data.setting_type;
    if (data.description !== undefined) existing.description = data.description;
    if (data.is_public !== undefined) existing.is_public = data.is_public;
    if (data.is_deleted !== undefined) existing.is_deleted = data.is_deleted;
    existing.updated_at = new Date();
    const saved = await updateDb(repo, existing, { queryRunner: qr });
    await auditLogger.logUpdate("SystemSetting", id, oldData, saved, user);
    return { ...saved, value: this._normalizeOutput(saved.value) };
  }

  /**
     * @param {string} key
     * @param {any} value
     */
  async setValueByKey(key, value, options = {}, user = "system", qr = null) {
    const existing = await this.getSettingByKey(key, options.setting_type);
    const now = new Date();
    if (existing) {
      return this.updateSetting(existing.id, { value, ...options }, user, qr);
    } else {
      return this.createSetting(
        {
          key,
          value,
          setting_type: options.setting_type || "general",
          description:
            options.description || `Auto-generated setting for ${key}`,
          is_public: options.is_public ?? false,
        },
        user,
        qr,
      );
    }
  }

  /**
     * @param {any} id
     */
  async deleteSetting(id, user = "system", qr = null) {
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);
    const setting = await repo.findOne({ where: { id, is_deleted: false } });
    if (!setting) throw new Error(`Setting with id ${id} not found`);
    setting.is_deleted = true;
    setting.updated_at = new Date();
    const saved = await updateDb(repo, setting, { queryRunner: qr });
    await auditLogger.logDelete("SystemSetting", id, setting, user);
    return saved;
  }

  /**
     * @param {any} settingsArray
     */
  async bulkUpdate(settingsArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const item of settingsArray) {
      try {
        const existing = await this.getSettingByKey(
          item.key,
          item.setting_type,
        );
        let saved;
        if (existing) {
          saved = await this.updateSetting(existing.id, item, user, qr);
          results.updated.push({ ...saved, action: "updated" });
        } else {
          saved = await this.createSetting(item, user, qr);
          results.updated.push({ ...saved, action: "created" });
        }
      } catch (err) {
        results.errors.push({ key: item.key, error: err.message });
      }
    }
    return results;
  }

  /**
     * @param {any} ids
     */
  async bulkDelete(ids, user = "system", qr = null) {
    const results = { deleted: [], errors: [] };
    for (const id of ids) {
      try {
        await this.deleteSetting(id, user, qr);
        results.deleted.push(id);
      } catch (err) {
        results.errors.push({ id, error: err.message });
      }
    }
    return results;
  }

  async getGroupedConfig() {
    const settings = await this.getAllSettings();
    const grouped = {};
    for (const s of settings) {
      if (!grouped[s.setting_type]) grouped[s.setting_type] = {};
      grouped[s.setting_type][s.key] = s.value;
    }
    return grouped;
  }

  /**
     * @param {{ [s: string]: any; } | ArrayLike<any>} configData
     */
  async updateGroupedConfig(configData, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const [category, dict] of Object.entries(configData)) {
      for (const [key, value] of Object.entries(dict)) {
        try {
          const saved = await this.setValueByKey(
            key,
            value,
            { setting_type: category },
            user,
            qr,
          );
          results.updated.push({ category, key, id: saved.id });
        } catch (err) {
          results.errors.push({ category, key, error: err.message });
        }
      }
    }
    return results;
  }

  async getSystemInfo() {
    const { version } = require("../../package.json");
    return {
      version,
      name: "Collectly",
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
      debug_mode: process.env.NODE_ENV === "development",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      current_time: new Date().toISOString(),
      setting_types: Object.values(
        require("../entities/systemSettings").SettingType,
      ),
    };
  }
}

const systemSettingService = new SystemSettingService();
module.exports = systemSettingService;
