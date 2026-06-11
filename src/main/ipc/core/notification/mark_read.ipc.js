// src/main/ipc/notification/mark_read.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner, user = "system") => {
  try {
    if (!params.id) {
      return { status: false, message: "Missing id", data: null };
    }
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return { status: false, message: "Invalid id", data: null };
    }
    const isRead = params.isRead !== false;
    const updated = await notificationService.markAsRead(id, isRead, user, queryRunner);
    return {
      status: true,
      message: `Notification marked as ${isRead ? "read" : "unread"}`,
      data: updated,
    };
  } catch (error) {
    console.error("Error in markAsRead:", error);
    return {
      status: false,
      message: error.message || "Failed to mark notification",
      data: null,
    };
  }
};