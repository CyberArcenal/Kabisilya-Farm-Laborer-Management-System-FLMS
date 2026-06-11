// src/main/ipc/utils/system_config/set_value.ipc.js
const systemSettingService = require("../../../../services/Settings");

module.exports = async (params, queryRunner) => {
  const { key, value, options, userId } = params;
  const saved = await systemSettingService.setValueByKey(key, value, options, `user_${userId}`, queryRunner);
  return { status: true, message: "Value set", data: saved };
};