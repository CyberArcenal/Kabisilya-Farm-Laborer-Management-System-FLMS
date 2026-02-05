// src/ipc/assignment/get/by_status.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get assignments by status scoped to current session
 * @param {string} status - Assignment status (active/completed/cancelled)
 * @param {Object} filters - Additional filters
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (status, filters = {}, userId) => {
  try {
    // Validate status
    const validStatuses = ["active", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return {
        status: false,
        message: "Invalid status",
        data: { errors: [`Must be one of: ${validStatuses.join(", ")}`] }
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("assignment.status = :status", { status })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .orderBy("assignment.assignmentDate", "DESC");

    // Apply additional filters
    // @ts-ignore
    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere(
        "assignment.assignmentDate BETWEEN :dateFrom AND :dateTo",
        // @ts-ignore
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      );
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

    // Calculate summary
    const totalLuWang = assignments.reduce(
      // @ts-ignore
      (sum, assignment) => sum + parseFloat(assignment.luwangCount || 0),
      0
    );

    return {
      status: true,
      message: `Assignments with status '${status}' retrieved successfully`,
      data: assignments.map((assignment) => ({
        id: assignment.id,
        // @ts-ignore
        luwangCount: parseFloat(assignment.luwangCount).toFixed(2),
        assignmentDate: assignment.assignmentDate,
        status: assignment.status,
        notes: assignment.notes,
        // @ts-ignore
        worker: assignment.worker
          // @ts-ignore
          ? { id: assignment.worker.id, name: assignment.worker.name }
          : null,
        // @ts-ignore
        pitak: assignment.pitak
          // @ts-ignore
          ? { id: assignment.pitak.id, name: assignment.pitak.name }
          : null
      })),
      meta: {
        total: assignments.length,
        totalLuWang: totalLuWang.toFixed(2),
        dateRange:
          // @ts-ignore
          filters.dateFrom && filters.dateTo
            // @ts-ignore
            ? { from: filters.dateFrom, to: filters.dateTo }
            : null,
        sessionId: currentSessionId,
        // @ts-ignore
        uniqueWorkers: new Set(assignments.map((a) => a.worker?.id)).size,
        // @ts-ignore
        uniquePitaks: new Set(assignments.map((a) => a.pitak?.id)).size
      }
    };
  } catch (error) {
    console.error(`Error getting assignments by status (${status}):`, error);
    return {
      status: false,
      message: "Failed to retrieve assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] }
    };
  }
};