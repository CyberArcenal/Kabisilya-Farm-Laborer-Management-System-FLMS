// src/main/ipc/assignment/update.ipc.js
const assignmentService = require("../../../../services/Assignment");
const { logger } = require("../../../../utils/logger");

/**
 * Update an existing assignment
 * @param {Object} params - { id, ...fields }
 * @param {import("typeorm").QueryRunner} [queryRunner]
 * @returns {Promise<{status: boolean, message: string, data?: any}>}
 */
module.exports = async function updateAssignment(params, queryRunner) {
  try {
    logger.info("IPC: updateAssignment", { params });

    if (!params.id) {
      return { status: false, message: "Missing id", data: null };
    }

    const result = await assignmentService.update(params.id, params, "system", queryRunner);
    return {
      status: true,
      message: "Assignment updated successfully",
      data: result,
    };
  } catch (error) {
    logger.error("IPC: updateAssignment error:", error);
    return {
      status: false,
      message: error.message || "Failed to update assignment",
      data: null,
    };
  }
};