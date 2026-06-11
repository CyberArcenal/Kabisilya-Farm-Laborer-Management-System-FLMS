// src/main/ipc/utils/system_config/update_grouped.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { configData, userId } = params;
  const result = await systemSettingService.updateGroupedConfig(configData, `user_${userId}`, queryRunner);
  const success = result.errors.length === 0;
  return {
    status: success,
    message: success ? "Configuration updated" : `Updated with ${result.errors.length} errors`,
    data: result,
  };
};