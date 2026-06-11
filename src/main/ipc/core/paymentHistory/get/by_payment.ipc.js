// src/main/ipc/paymentHistory/get/by_payment.ipc.js
// @ts-check
const paymentHistoryService = require("../../../../../services/PaymentHistoryService");
const { logger } = require("../../../../../utils/logger");

module.exports = async function getPaymentHistoriesByPayment(params) {
  try {
    logger.info("IPC: getPaymentHistoriesByPayment", { params });
    if (!params.paymentId)
      return { status: false, message: "Missing paymentId", data: null };
    const histories = await paymentHistoryService.findAll({
      ...params,
      paymentId: params.paymentId,
    });
    return {
      status: true,
      message: "Payment histories retrieved",
      data: histories.data,
      pagination: histories.pagination,
    };
  } catch (error) {
    logger.error("IPC: getPaymentHistoriesByPayment error:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve payment histories",
      pagination: null,
      data: null,
    };
  }
};
