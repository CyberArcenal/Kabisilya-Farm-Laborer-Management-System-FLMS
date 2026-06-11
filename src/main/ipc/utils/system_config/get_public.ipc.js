const systemSettingService = require("../../../../services/Settings");
module.exports = async () => {
  const settings = await systemSettingService.getPublicSettings();
  return { status: true, message: "Public settings", data: settings };
};