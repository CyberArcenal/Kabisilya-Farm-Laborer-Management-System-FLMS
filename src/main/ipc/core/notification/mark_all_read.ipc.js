// src/main/ipc/notification/mark_all_read.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner, user = "system") => {
  try {
    const userId = params.userId || null;
    const count = await notificationService.markAllAsRead(userId, user, queryRunner);
    return {
      status: true,
      message: `Marked ${count} notifications as read`,
      data: count,
    };
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    return {
      status: false,
      message: error.message || "Failed to mark all as read",
      data: 0,
    };
  }
};