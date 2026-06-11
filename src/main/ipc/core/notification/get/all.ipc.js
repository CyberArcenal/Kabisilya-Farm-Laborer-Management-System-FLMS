// src/main/ipc/notification/get/all.ipc.js
const notificationService = require("../../../../../services/Notification");

/**
 * Get all notifications with optional filtering and pagination
 * @param {Object} params - { isRead, limit, offset, sortBy, sortOrder, page }
 * @returns {Promise<{status: boolean, message: string, data: any[], pagination: any}>}
 */
module.exports = async (params) => {
  try {
    // Convert offset/limit to page/limit if needed
    let page = params.page || 1;
    let limit = params.limit || 50;
    if (params.offset !== undefined && params.limit !== undefined) {
      page = Math.floor(params.offset / params.limit) + 1;
      limit = params.limit;
    }

    const options = {
      isRead: params.isRead,
      page,
      limit,
      sortBy: params.sortBy || "createdAt",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
    };
    // Remove undefined
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    const result = await notificationService.findAll(options);
    // result = { data: [], pagination: { page, limit, total, pages } }
    return {
      status: true,
      message: "Notifications retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("Error in getAllNotifications:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notifications",
      data: null,
      pagination: null,
    };
  }
};