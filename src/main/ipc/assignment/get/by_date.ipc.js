// src/ipc/assignment/get/by_date.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get assignments by date scoped to current session
 * @param {string|Date} date - Date to filter assignments
 * @param {Object} filters - Additional filters
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (date, filters = {}, userId) => {
  try {
    if (!date) {
      return {
        status: false,
        message: "Date parameter is required",
        data: { errors: ["Missing date parameter"] }
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Parse date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("assignment.assignmentDate >= :startDate", { startDate: targetDate })
      .andWhere("assignment.assignmentDate < :endDate", { endDate: nextDay })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .orderBy("worker.id", "ASC");

    // Apply additional filters
    // @ts-ignore
    if (filters.status) {
      // @ts-ignore
      queryBuilder.andWhere("assignment.status = :status", { status: filters.status });
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

    // Calculate summary for the day
    const summary = {
      totalAssignments: assignments.length,
      totalLuWang: 0,
      activeAssignments: 0,
      completedAssignments: 0,
      cancelledAssignments: 0,
      uniqueWorkers: new Set(),
      uniquePitaks: new Set()
    };

    const formattedAssignments = assignments.map((assignment) => {
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // Update summary
      summary.totalLuWang += luwang;
      // @ts-ignore
      summary.uniqueWorkers.add(assignment.worker?.id);
      // @ts-ignore
      summary.uniquePitaks.add(assignment.pitak?.id);

      if (assignment.status === "active") summary.activeAssignments++;
      if (assignment.status === "completed") summary.completedAssignments++;
      if (assignment.status === "cancelled") summary.cancelledAssignments++;

      return {
        id: assignment.id,
        luwangCount: luwang.toFixed(2),
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
          ? { id: assignment.pitak.id, location: assignment.pitak.location }
          : null
      };
    });

    // @ts-ignore
    summary.totalLuWang = summary.totalLuWang.toFixed(2);
    // @ts-ignore
    summary.uniqueWorkers = summary.uniqueWorkers.size;
    // @ts-ignore
    summary.uniquePitaks = summary.uniquePitaks.size;

    return {
      status: true,
      message: `Assignments for ${targetDate.toLocaleDateString()} retrieved successfully`,
      data: formattedAssignments,
      meta: {
        date: targetDate.toISOString().split("T")[0],
        sessionId: currentSessionId,
        summary
      }
    };
  } catch (error) {
    console.error("Error getting assignments by date:", error);
    return {
      status: false,
      message: "Failed to retrieve assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] }
    };
  }
};