// src/main/ipc/utils/system_config/get_grouped.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params) => {
  const grouped = await systemSettingService.getGroupedConfig();
  const systemInfo = await systemSettingService.getSystemInfo();
  return {
    status: true,
    message: "System configuration retrieved",
    data: { grouped_settings: grouped, system_info: systemInfo, settings: [] },
  };
};