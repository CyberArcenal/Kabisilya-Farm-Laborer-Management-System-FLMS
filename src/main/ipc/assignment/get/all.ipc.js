// src/ipc/assignment/get/all.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
// @ts-ignore
const Worker = require("../../../../entities/Worker");
// @ts-ignore
const Pitak = require("../../../../entities/Pitak");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get all assignments with optional filters, scoped to current session
 * @param {Object} filters - Filter criteria
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (filters = {}, userId) => {
  try {
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Build query with joins
    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("session.id = :sessionId", { sessionId: currentSessionId })
      .orderBy("assignment.assignmentDate", "DESC");

    // Apply filters
    // @ts-ignore
    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere(
        "assignment.assignmentDate BETWEEN :dateFrom AND :dateTo",
        {
          // @ts-ignore
          dateFrom: filters.dateFrom,
          // @ts-ignore
          dateTo: filters.dateTo,
        },
      );
    }

    // @ts-ignore
    if (filters.status) {
      queryBuilder.andWhere("assignment.status = :status", {
        // @ts-ignore
        status: filters.status,
      });
    }

    // @ts-ignore
    if (filters.workerId) {
      // @ts-ignore
      queryBuilder.andWhere("worker.id = :workerId", { workerId: filters.workerId });
    }

    // @ts-ignore
    if (filters.pitakId) {
      // @ts-ignore
      queryBuilder.andWhere("pitak.id = :pitakId", { pitakId: filters.pitakId });
    }

    const assignments = await queryBuilder.getMany();

    // Format response
    const formattedAssignments = assignments.map((assignment) => ({
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
          }
        : null,
      // @ts-ignore
      pitak: assignment.pitak
        ? {
            // @ts-ignore
            id: assignment.pitak.id,
            // @ts-ignore
            location: assignment.pitak.location,
          }
        : null,
    }));

    return {
      status: true,
      message: "Assignments retrieved successfully",
      data: formattedAssignments,
      meta: {
        total: formattedAssignments.length,
        active: formattedAssignments.filter((a) => a.status === "active").length,
        completed: formattedAssignments.filter((a) => a.status === "completed").length,
        cancelled: formattedAssignments.filter((a) => a.status === "cancelled").length,
        sessionId: currentSessionId,
        // @ts-ignore
        uniqueWorkers: new Set(assignments.map((a) => a.worker?.id)).size,
        // @ts-ignore
        uniquePitaks: new Set(assignments.map((a) => a.pitak?.id)).size,
      },
    };
  } catch (error) {
    console.error("Error getting all assignments:", error);
    return {
      status: false,
      message: "Failed to retrieve assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};