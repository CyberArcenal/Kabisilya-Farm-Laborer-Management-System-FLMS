// src/main/ipc/notification/delete.ipc.js
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
    const result = await notificationService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Notification soft deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return {
      status: false,
      message: error.message || "Failed to delete notification",
      data: null,
    };
  }
};