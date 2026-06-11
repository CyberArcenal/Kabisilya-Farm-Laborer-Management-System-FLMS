// src/main/ipc/assignment/create.ipc.js

const assignmentService = require("../../../../services/Assignment");
const { logger } = require("../../../../utils/logger");

/**
 * Create a new assignment
 * @param {Object} params - { workerId, pitakId, sessionId, luwangCount, assignmentDate, notes?, status? }
 * @param {import("typeorm").QueryRunner} [queryRunner] - Transaction query runner
 * @returns {Promise<{status: boolean, message: string, data?: any}>}
 */
module.exports = async function createAssignment(params, queryRunner) {
  try {
    logger.info("IPC: createAssignment", { params });

    // Basic validation (service will also validate)
    if (!params.workerId || !params.pitakId || !params.sessionId  || !params.assignmentDate) {
      return {
        status: false,
        message: "Missing required fields: workerId, pitakId, sessionId, assignmentDate",
        data: null,
      };
    }

    const result = await assignmentService.create(params, "system", queryRunner);
    return {
      status: true,
      message: "Assignment created successfully",
      data: result,
    };
  } catch (error) {
    logger.error("IPC: createAssignment error:", error);
    return {
      status: false,
      message: error.message || "Failed to create assignment",
      data: null,
    };
  }
};