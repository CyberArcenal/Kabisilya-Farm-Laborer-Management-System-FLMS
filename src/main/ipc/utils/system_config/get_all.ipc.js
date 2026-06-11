const systemSettingService = require("../../../../services/Settings");
module.exports = async () => {
  const settings = await systemSettingService.getAllSettings();
  return { status: true, message: "All settings", data: settings };
};
