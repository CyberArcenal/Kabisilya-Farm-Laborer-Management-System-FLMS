const systemSettingService = require("../../../../services/Settings");
module.exports = async (params) => {
  const { key, defaultValue } = params;
  const value = await systemSettingService.getValueByKey(key, defaultValue);
  return { status: true, message: "Value retrieved", data: value };
};