// src/main/ipc/utils/system_config/create.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { settingData, userId } = params;
  const created = await systemSettingService.createSetting(settingData, `user_${userId}`, queryRunner);
  return { status: true, message: "Setting created", data: created };
};