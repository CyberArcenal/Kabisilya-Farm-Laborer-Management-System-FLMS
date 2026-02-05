// src/ipc/assignment/get/active.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get active assignments scoped to current session
 * @param {Object} filters - Additional filters
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (filters = {}, userId) => {
  try {
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("assignment.status = :status", { status: "active" })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .orderBy("assignment.assignmentDate", "DESC");

    // Apply date filters
    // @ts-ignore
    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere(
        "assignment.assignmentDate BETWEEN :dateFrom AND :dateTo",
        // @ts-ignore
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      );
    }

    // Apply worker filter
    // @ts-ignore
    if (filters.workerId) {
      queryBuilder.andWhere("worker.id = :workerId", {
        // @ts-ignore
        workerId: filters.workerId,
      });
    }

    // Apply pitak filter
    // @ts-ignore
    if (filters.pitakId) {
      queryBuilder.andWhere("pitak.id = :pitakId", {
        // @ts-ignore
        pitakId: filters.pitakId,
      });
    }

    const assignments = await queryBuilder.getMany();

    // Group assignments by date
    const assignmentsByDate = {};
    let totalLuWang = 0;
    let todayCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    assignments.forEach((assignment) => {
      // @ts-ignore
      const dateStr = assignment.assignmentDate.toISOString().split("T")[0];
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // @ts-ignore
      if (!assignmentsByDate[dateStr]) {
        // @ts-ignore
        assignmentsByDate[dateStr] = [];
      }

      // @ts-ignore
      assignmentsByDate[dateStr].push({
        id: assignment.id,
        luwangCount: luwang.toFixed(2),
        // @ts-ignore
        worker: assignment.worker
          // @ts-ignore
          ? { id: assignment.worker.id, name: assignment.worker.name }
          : null,
        // @ts-ignore
        pitak: assignment.pitak
          // @ts-ignore
          ? { id: assignment.pitak.id, name: assignment.pitak.name }
          : null,
        notes: assignment.notes,
      });

      totalLuWang += luwang;

      // @ts-ignore
      const assignmentDate = new Date(assignment.assignmentDate);
      assignmentDate.setHours(0, 0, 0, 0);
      if (assignmentDate.getTime() === today.getTime()) {
        todayCount++;
      }
    });

    // Convert grouped assignments to array and sort by date (newest first)
    const groupedAssignments = Object.entries(assignmentsByDate)
      .map(([date, assignments]) => ({
        date,
        assignments,
        count: assignments.length,
        totalLuWang: assignments
          // @ts-ignore
          .reduce((sum, a) => sum + parseFloat(a.luwangCount), 0)
          .toFixed(2),
      }))
      // @ts-ignore
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      status: true,
      message: "Active assignments retrieved successfully",
      data: {
        assignments: assignments.map((assignment) => ({
          id: assignment.id,
          // @ts-ignore
          luwangCount: parseFloat(assignment.luwangCount).toFixed(2),
          assignmentDate: assignment.assignmentDate,
          // @ts-ignore
          worker: assignment.worker
            // @ts-ignore
            ? { id: assignment.worker.id, name: assignment.worker.name }
            : null,
          // @ts-ignore
          pitak: assignment.pitak
            // @ts-ignore
            ? { id: assignment.pitak.id, name: assignment.pitak.name }
            : null,
        })),
        groupedByDate: groupedAssignments,
      },
      meta: {
        total: assignments.length,
        totalLuWang: totalLuWang.toFixed(2),
        todayCount,
        // @ts-ignore
        uniqueWorkers: new Set(assignments.map((a) => a.worker?.id)).size,
        // @ts-ignore
        uniquePitaks: new Set(assignments.map((a) => a.pitak?.id)).size,
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error getting active assignments:", error);
    return {
      status: false,
      message: "Failed to retrieve active assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
