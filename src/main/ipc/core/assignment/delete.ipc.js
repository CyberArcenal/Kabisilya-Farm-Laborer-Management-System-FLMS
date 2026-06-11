// src/main/ipc/assignment/delete.ipc.js
const assignmentService = require("../../../../services/Assignment");
const { logger } = require("../../../../utils/logger");

/**
 * Delete (cancel) an assignment
 * @param {Object} params - { id }
 * @param {import("typeorm").QueryRunner} [queryRunner]
 * @returns {Promise<{status: boolean, message: string, data?: any}>}
 */
module.exports = async function deleteAssignment(params, queryRunner) {
  try {
    logger.info("IPC: deleteAssignment", { params });

    if (!params.id) {
      return { status: false, message: "Missing id", data: null };
    }

    const result = await assignmentService.delete(params.id, "system", queryRunner);
    return {
      status: true,
      message: "Assignment cancelled successfully",
      data: result,
    };
  } catch (error) {
    logger.error("IPC: deleteAssignment error:", error);
    return {
      status: false,
      message: error.message || "Failed to delete assignment",
      data: null,
    };
  }
};