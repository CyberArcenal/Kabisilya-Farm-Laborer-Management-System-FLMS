// src/main/ipc/paymentHistory/get/all.ipc.js
module.exports = async function getAllPaymentHistories(params) {
  try {
    logger.info("IPC: getAllPaymentHistories", { params });
    const result = await paymentHistoryService.findAll(params);
    // result = { data: [], pagination: {} }
    return {
      status: true,
      message: "Payment histories retrieved",
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("IPC: getAllPaymentHistories error:", error);
    return {
      status: false,
      message: error.message,
      data: null,
      pagination: null,
    };
  }
};
