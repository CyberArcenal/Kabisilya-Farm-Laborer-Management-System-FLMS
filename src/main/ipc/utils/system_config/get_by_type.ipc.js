const systemSettingService = require("../../../../services/Settings");
module.exports = async (params) => {
  const { settingType } = params;
  const settings = await systemSettingService.getByType(settingType);
  return { status: true, message: "Settings by type", data: settings };
};