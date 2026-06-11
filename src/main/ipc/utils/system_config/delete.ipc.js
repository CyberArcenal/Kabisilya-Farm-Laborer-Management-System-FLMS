// src/main/ipc/utils/system_config/delete.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { id, userId } = params;
  await systemSettingService.deleteSetting(id, `user_${userId}`, queryRunner);
  return { status: true, message: "Setting deleted", data: null };
};