// src/main/ipc/pitak/get/by_bukid.ipc.js
const pitakService = require("../../../../../services/PitakService");
const { logger } = require("../../../../../utils/logger");

module.exports = async function getPitaksByBukid(params) {
  try {
    logger.info("IPC: getPitaksByBukid", { params });
    if (!params.bukidId)
      return { status: false, message: "Missing bukidId", data: null };
    const pitaks = await pitakService.findAll({
      ...params,
      bukidId: params.bukidId,
    });
    return {
      status: true,
      message: "Pitaks retrieved",
      data: pitaks.data,
      pagination: pitaks.pagination,
    };
  } catch (error) {
    logger.error("IPC: getPitaksByBukid error:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve pitaks",
      data: null,
    };
  }
};
