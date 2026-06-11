// src/main/ipc/utils/system_config/update.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { id, settingData, userId } = params;
  const updated = await systemSettingService.updateSetting(id, settingData, `user_${userId}`, queryRunner);
  return { status: true, message: "Setting updated", data: updated };
};