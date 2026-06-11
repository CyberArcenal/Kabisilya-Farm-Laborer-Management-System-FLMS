// src/main/ipc/pitak/get/all.ipc.js
module.exports = async function getAllPitaks(params) {
  try {
    logger.info("IPC: getAllPitaks", { params });
    const result = await pitakService.findAll(params);
    // result = { data: [], pagination: {} }
    return {
      status: true,
      message: "Pitaks retrieved",
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("IPC: getAllPitaks error:", error);
    return { status: false, message: error.message, data: null, pagination: null };
  }
};