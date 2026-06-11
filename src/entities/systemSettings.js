// src/entities/SystemSetting.js
const { EntitySchema } = require("typeorm");

const SettingType = {
  GENERAL: "general",
  COLLECTIONS: "collections",
  LOANS: "loans",
  NOTIFICATIONS: "notifications",
  REPORTS: "reports",
  INTEGRATIONS: "integrations",
  AUDIT_SECURITY: "audit_security",
};

const SystemSetting = new EntitySchema({
  name: "SystemSetting",
  tableName: "system_settings",
  columns: {
    id: { type: "int", primary: true, generated: true },
    key: { type: "varchar", length: 100, nullable: false },
    value: { type: "text", nullable: false },
    setting_type: {
      type: "varchar",
      name: "setting_type",
      enum: Object.values(SettingType),
      nullable: false,
    },
    description: { type: "text", nullable: true },
    is_public: { type: "boolean", name: "is_public", default: false },
    is_deleted: { type: "boolean", name: "is_deleted", default: false },
    created_at: {
      type: "datetime",
      name: "created_at",
      createDate: true,
      default: () => "CURRENT_TIMESTAMP",
    },
    updated_at: {
      type: "datetime",
      name: "updated_at",
      updateDate: true,
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP",
    },
  },
  indices: [
    {
      name: "idx_system_settings_type_key",
      columns: ["setting_type", "key"],
      unique: true,
    },
  ],
});

module.exports = { SystemSetting, SettingType };
