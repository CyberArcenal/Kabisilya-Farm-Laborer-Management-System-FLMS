// src/main/ipc/worker/get/by_status.ipc.js

const workerService = require("../../../../../services/WorkerService");
const { logger } = require("../../../../../utils/logger");

module.exports = async function getWorkersByStatus(params) {
  try {
    logger.info("IPC: getWorkersByStatus", { params });
    if (!params.status)
      return { status: false, message: "Missing status", data: null };
    const workers = await workerService.findAll({
      ...params,
      status: params.status,
    });
    return { status: true, message: "Workers retrieved", data: workers.data, pagination: workers.pagination };
  } catch (error) {
    logger.error("IPC: getWorkersByStatus error:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve workers",
      pagination: null,
      data: null,
    };
  }
};
