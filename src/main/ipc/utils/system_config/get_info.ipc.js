const systemSettingService = require("../../../../services/Settings");
module.exports = async () => {
  const info = await systemSettingService.getSystemInfo();
  return { status: true, message: "System info", data: info };
};