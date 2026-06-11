// src/main/ipc/notification/get/unread_count.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async (params) => {
  try {
    const userId = params.userId || null;
    const count = await notificationService.getUnreadCount(userId);
    return {
      status: true,
      message: "Unread count retrieved",
      data: count,
    };
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    return {
      status: false,
      message: error.message || "Failed to get unread count",
      data: 0,
    };
  }
};