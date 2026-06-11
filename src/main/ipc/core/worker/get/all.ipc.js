// src/main/ipc/worker/get/all.ipc.js
module.exports = async function getAllWorkers(params) {
  try {
    logger.info("IPC: getAllWorkers", { params });
    const result = await workerService.findAll(params);
    // result = { data: [], pagination: {} }
    return {
      status: true,
      message: "Workers retrieved",
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("IPC: getAllWorkers error:", error);
    return { status: false, message: error.message, data: null, pagination: null };
  }
};