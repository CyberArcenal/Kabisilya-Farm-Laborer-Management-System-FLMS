// src/ipc/assignment/get/by_id.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get assignment by ID scoped to current session
 * @param {number} id - Assignment ID
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (id, userId) => {
  try {
    if (!id) {
      return {
        status: false,
        message: "Assignment ID is required",
        data: { errors: ["Missing assignment ID"] },
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    const assignment = await assignmentRepo.findOne({
      // @ts-ignore
      where: { id, session: { id: currentSessionId } },
      relations: ["worker", "pitak", "session"],
    });

    if (!assignment) {
      return {
        status: false,
        message: "Assignment not found in current session",
        data: {
          errors: [`Assignment ${id} not found or not part of active session`],
        },
      };
    }

    // Format response
    const formattedAssignment = {
      id: assignment.id,
      // @ts-ignore
      luwangCount: parseFloat(assignment.luwangCount),
      assignmentDate: assignment.assignmentDate,
      status: assignment.status,
      notes: assignment.notes,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      // @ts-ignore
      worker: assignment.worker
        ? {
            // @ts-ignore
            id: assignment.worker.id,
            // @ts-ignore
            name: assignment.worker.name,
            // @ts-ignore
            contact: assignment.worker.contact,
            // @ts-ignore
            email: assignment.worker.email,
          }
        : null,
      // @ts-ignore
      pitak: assignment.pitak
        ? {
            // @ts-ignore
            id: assignment.pitak.id,
            // @ts-ignore
            location: assignment.pitak.location,
            // @ts-ignore
            status: assignment.pitak.status,
          }
        : null,
      // @ts-ignore
      session: { id: assignment.session.id },
    };

    return {
      status: true,
      message: "Assignment retrieved successfully",
      data: formattedAssignment,
    };
  } catch (error) {
    console.error("Error getting assignment by ID:", error);
    return {
      status: false,
      message: "Failed to retrieve assignment",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
