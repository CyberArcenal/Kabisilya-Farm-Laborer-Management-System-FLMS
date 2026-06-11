// src/main/ipc/worker/get/by_id.ipc.js

const workerService = require("../../../../../services/WorkerService");
const { logger } = require("../../../../../utils/logger");

module.exports = async function getWorkerById(params) {
  try {
    logger.info("IPC: getWorkerById", { params });
    if (!params.id) return { status: false, message: "Missing id", data: null };
    const worker = await workerService.findById(params.id);
    return { status: true, message: "Worker retrieved", data: worker };
  } catch (error) {
    logger.error("IPC: getWorkerById error:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve worker",
      data: null,
    };
  }
};
