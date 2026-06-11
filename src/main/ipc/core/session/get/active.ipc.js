// src/main/ipc/session/get/active.ipc.js
module.exports = async function getActiveSession(params) {
  try {
    logger.info("IPC: getActiveSession", { params });
    const result = await sessionService.findAll({ status: 'active', limit: 1 });
    const active = result.data.length > 0 ? result.data[0] : null;
    return { status: true, message: "Active session retrieved", data: active };
  } catch (error) {
    logger.error("IPC: getActiveSession error:", error);
    return { status: false, message: error.message, data: null };
  }
};