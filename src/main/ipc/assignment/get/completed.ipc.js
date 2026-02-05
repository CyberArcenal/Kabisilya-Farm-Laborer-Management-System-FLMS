// src/ipc/assignment/get/completed.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get completed assignments scoped to current session
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
      .where("assignment.status = :status", { status: "completed" })
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

    // Calculate statistics
    const stats = {
      totalAssignments: assignments.length,
      totalLuWang: 0,
      averageLuWang: 0,
      byMonth: {},
      topWorkers: {},
      topPitaks: {},
    };

    const formattedAssignments = assignments.map((assignment) => {
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // Update stats
      stats.totalLuWang += luwang;

      // Group by month
      const month = assignment.assignmentDate
        // @ts-ignore
        ? assignment.assignmentDate.toISOString().substring(0, 7)
        : "unknown";
      // @ts-ignore
      if (!stats.byMonth[month]) {
        // @ts-ignore
        stats.byMonth[month] = { count: 0, totalLuWang: 0 };
      }
      // @ts-ignore
      stats.byMonth[month].count++;
      // @ts-ignore
      stats.byMonth[month].totalLuWang += luwang;

      // Track top workers
      // @ts-ignore
      if (assignment.worker) {
        // @ts-ignore
        const workerId = assignment.worker.id;
        // @ts-ignore
        if (!stats.topWorkers[workerId]) {
          // @ts-ignore
          stats.topWorkers[workerId] = {
            id: workerId,
            // @ts-ignore
            name: assignment.worker.name,
            assignments: 0,
            totalLuWang: 0,
          };
        }
        // @ts-ignore
        stats.topWorkers[workerId].assignments++;
        // @ts-ignore
        stats.topWorkers[workerId].totalLuWang += luwang;
      }

      // Track top pitaks
      // @ts-ignore
      if (assignment.pitak) {
        // @ts-ignore
        const pitakId = assignment.pitak.id;
        // @ts-ignore
        if (!stats.topPitaks[pitakId]) {
          // @ts-ignore
          stats.topPitaks[pitakId] = {
            id: pitakId,
            // @ts-ignore
            name: assignment.pitak.name,
            assignments: 0,
            totalLuWang: 0,
          };
        }
        // @ts-ignore
        stats.topPitaks[pitakId].assignments++;
        // @ts-ignore
        stats.topPitaks[pitakId].totalLuWang += luwang;
      }

      return {
        id: assignment.id,
        luwangCount: luwang.toFixed(2),
        assignmentDate: assignment.assignmentDate,
        // @ts-ignore
        worker: assignment.worker
          // @ts-ignore
          ? { id: assignment.worker.id, name: assignment.worker.name }
          : null,
        // @ts-ignore
        pitak: assignment.pitak
          ? {
              // @ts-ignore
              id: assignment.pitak.id,
              // @ts-ignore
              name: assignment.pitak.name,
              // @ts-ignore
              location: assignment.pitak.location,
            }
          : null,
        notes: assignment.notes,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      };
    });

    // Calculate averages
    if (stats.totalAssignments > 0) {
      // @ts-ignore
      stats.averageLuWang = (
        stats.totalLuWang / stats.totalAssignments
      ).toFixed(2);
    }
    // @ts-ignore
    stats.totalLuWang = stats.totalLuWang.toFixed(2);

    // Convert byMonth to array
    stats.byMonth = Object.entries(stats.byMonth)
      .map(([month, data]) => ({
        month,
        ...data,
        averageLuWang: (data.totalLuWang / data.count).toFixed(2),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Get top 5 workers by totalLuWang
    stats.topWorkers = Object.values(stats.topWorkers)
      .sort((a, b) => b.totalLuWang - a.totalLuWang)
      .slice(0, 5)
      .map((worker) => ({
        ...worker,
        totalLuWang: worker.totalLuWang.toFixed(2),
        averageLuWang: (worker.totalLuWang / worker.assignments).toFixed(2),
      }));

    // Get top 5 pitaks by totalLuWang
    stats.topPitaks = Object.values(stats.topPitaks)
      .sort((a, b) => b.totalLuWang - a.totalLuWang)
      .slice(0, 5)
      .map((pitak) => ({
        ...pitak,
        totalLuWang: pitak.totalLuWang.toFixed(2),
        averageLuWang: (pitak.totalLuWang / pitak.assignments).toFixed(2),
      }));

    return {
      status: true,
      message: "Completed assignments retrieved successfully",
      data: formattedAssignments,
      meta: {
        summary: stats,
        dateRange:
          // @ts-ignore
          filters.dateFrom && filters.dateTo
            // @ts-ignore
            ? { from: filters.dateFrom, to: filters.dateTo }
            : "All time",
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error getting completed assignments:", error);
    return {
      status: false,
      message: "Failed to retrieve completed assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
