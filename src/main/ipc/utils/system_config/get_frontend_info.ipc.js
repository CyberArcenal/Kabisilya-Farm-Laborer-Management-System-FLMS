const systemSettingService = require("../../../../services/Settings");
module.exports = async () => {
  const [systemInfo, publicSettings] = await Promise.all([
    systemSettingService.getSystemInfo(),
    systemSettingService.getPublicSettings(),
  ]);
  return {
    status: true,
    message: "Frontend system info",
    data: {
      system_info: systemInfo,
      public_settings: publicSettings,
      cache_timestamp: new Date().toISOString(),
    },
  };
};