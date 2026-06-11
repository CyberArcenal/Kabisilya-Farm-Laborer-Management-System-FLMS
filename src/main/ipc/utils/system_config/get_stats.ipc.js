const systemSettingService = require("../../../../services/Settings");
module.exports = async () => {
  const settings = await systemSettingService.getAllSettings();
  const byType = {};
  for (const s of settings) byType[s.setting_type] = (byType[s.setting_type] || 0) + 1;
  const publicCount = settings.filter(s => s.is_public).length;
  return {
    status: true,
    message: "Stats",
    data: {
      total: settings.length,
      by_type: byType,
      public_count: publicCount,
      private_count: settings.length - publicCount,
      timestamp: new Date().toISOString(),
    },
  };
};
