const systemSettingService = require("../../../../services/Settings");
module.exports = async (params) => {
  const { key, settingType } = params;
  const setting = await systemSettingService.getSettingByKey(key, settingType);
  if (!setting) return { status: true, message: "Not found", data: null };
  return { status: true, message: "Found", data: setting };
};