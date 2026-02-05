// src/ipc/assignment/get/by_worker.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
const Worker = require("../../../../entities/Worker");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get assignments by worker scoped to current session
 * @param {number} workerId - Worker ID
 * @param {Object} filters - Additional filters
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (workerId, filters = {}, userId) => {
  try {
    if (!workerId) {
      return {
        status: false,
        message: "Worker ID is required",
        data: { errors: ["Missing workerId parameter"] }
      };
    }

    // Validate worker exists
    const workerRepo = AppDataSource.getRepository(Worker);
    const worker = await workerRepo.findOne({ where: { id: workerId } });

    if (!worker) {
      return {
        status: false,
        message: "Worker not found",
        data: { errors: [`Worker ${workerId} not found`] }
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("worker.id = :workerId", { workerId })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .orderBy("assignment.assignmentDate", "DESC");

    // Apply date filters
    // @ts-ignore
    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere(
        "assignment.assignmentDate BETWEEN :dateFrom AND :dateTo",
        // @ts-ignore
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      );
    }

    // Apply status filter
    // @ts-ignore
    if (filters.status) {
      // @ts-ignore
      queryBuilder.andWhere("assignment.status = :status", { status: filters.status });
    }

    const assignments = await queryBuilder.getMany();

    // Calculate worker statistics
    const stats = {
      totalAssignments: assignments.length,
      totalLuWang: 0,
      averageLuWang: 0,
      byStatus: { active: 0, completed: 0, cancelled: 0 },
      byMonth: {}
    };

    const formattedAssignments = assignments.map((assignment) => {
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // Update stats
      stats.totalLuWang += luwang;
      // @ts-ignore
      if (stats.byStatus[assignment.status] !== undefined) {
        // @ts-ignore
        stats.byStatus[assignment.status]++;
      }

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

      return {
        id: assignment.id,
        luwangCount: luwang.toFixed(2),
        assignmentDate: assignment.assignmentDate
          // @ts-ignore
          ? assignment.assignmentDate.toISOString().split("T")[0]
          : null,
        status: assignment.status,
        notes: assignment.notes,
        // @ts-ignore
        pitak: assignment.pitak
          ? {
              // @ts-ignore
              id: assignment.pitak.id,
              // @ts-ignore
              location: assignment.pitak.location,
              // @ts-ignore
              totalLuwang: parseFloat(assignment.pitak.totalLuwang) || 0,
              // @ts-ignore
              status: assignment.pitak.status
            }
          : null
      };
    });

    // Calculate averages
    if (stats.totalAssignments > 0) {
      // @ts-ignore
      stats.averageLuWang = (stats.totalLuWang / stats.totalAssignments).toFixed(2);
    }
    // @ts-ignore
    stats.totalLuWang = stats.totalLuWang.toFixed(2);

    // Convert byMonth to array
    stats.byMonth = Object.entries(stats.byMonth)
      .map(([month, data]) => ({
        month,
        ...data,
        averageLuWang: (data.totalLuWang / data.count).toFixed(2)
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      status: true,
      message: `Assignments for worker '${worker.name}' retrieved successfully`,
      data: {
        worker: {
          id: worker.id,
          name: worker.name,
          // @ts-ignore
          contactNumber: worker.contactNumber || null
        },
        assignments: formattedAssignments,
        statistics: stats
      },
      meta: { sessionId: currentSessionId }
    };
  } catch (error) {
    console.error("Error getting assignments by worker:", error);
    return {
      status: false,
      message: "Failed to retrieve assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] }
    };
  }
};