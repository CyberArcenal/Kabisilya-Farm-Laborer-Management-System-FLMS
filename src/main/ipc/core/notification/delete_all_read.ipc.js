// src/main/ipc/notification/delete_all_read.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Get all read notifications (non-deleted)
    const result = await notificationService.findAll({ isRead: true, includeDeleted: false, limit: 10000 });
    const readNotifications = result.data;
    const ids = readNotifications.map(n => n.id);
    if (ids.length === 0) {
      return { status: true, message: "No read notifications to delete", data: 0 };
    }
    let deletedCount = 0;
    for (const id of ids) {
      await notificationService.delete(id, user, queryRunner);
      deletedCount++;
    }
    return {
      status: true,
      message: `Deleted ${deletedCount} read notifications`,
      data: deletedCount,
    };
  } catch (error) {
    console.error("Error in deleteAllRead:", error);
    return {
      status: false,
      message: error.message || "Failed to delete read notifications",
      data: 0,
    };
  }
};