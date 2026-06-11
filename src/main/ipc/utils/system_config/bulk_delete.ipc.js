// src/main/ipc/utils/system_config/bulk_delete.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { ids, userId } = params;
  const result = await systemSettingService.bulkDelete(ids, `user_${userId}`, queryRunner);
  const success = result.errors.length === 0;
  return {
    status: success,
    message: success ? "Bulk delete completed" : `Completed with ${result.errors.length} errors`,
    data: result,
  };
};