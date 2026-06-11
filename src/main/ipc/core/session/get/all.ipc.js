// src/main/ipc/session/get/all.ipc.js
module.exports = async function getAllSessions(params) {
  try {
    logger.info("IPC: getAllSessions", { params });
    const result = await sessionService.findAll(params);
    // result = { data: [], pagination: {} }
    return {
      status: true,
      message: "Sessions retrieved",
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("IPC: getAllSessions error:", error);
    return { status: false, message: error.message, data: null, pagination: null };
  }
};