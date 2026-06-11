// src/main/ipc/utils/system_config/bulk_update.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { settingsData, userId } = params;
  const result = await systemSettingService.bulkUpdate(settingsData, `user_${userId}`, queryRunner);
  const success = result.errors.length === 0;
  return {
    status: success,
    message: success ? "Bulk update completed" : `Completed with ${result.errors.length} errors`,
    data: result,
  };
};