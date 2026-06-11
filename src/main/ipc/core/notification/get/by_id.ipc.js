// src/main/ipc/notification/get/by_id.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async (params) => {
  try {
    if (!params.id) {
      return { status: false, message: "Missing id", data: null };
    }
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return { status: false, message: "Invalid id", data: null };
    }
    const notification = await notificationService.findById(id);
    return {
      status: true,
      message: "Notification retrieved successfully",
      data: notification,
    };
  } catch (error) {
    console.error("Error in getNotificationById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification",
      data: null,
    };
  }
};