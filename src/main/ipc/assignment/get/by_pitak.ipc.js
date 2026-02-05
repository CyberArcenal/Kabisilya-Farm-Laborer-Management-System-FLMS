// src/ipc/assignment/get/by_pitak.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
const Pitak = require("../../../../entities/Pitak");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get assignments by pitak scoped to current session
 * @param {number} pitakId - Pitak ID
 * @param {Object} filters - Additional filters
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (pitakId, filters = {}, userId) => {
  try {
    if (!pitakId) {
      return {
        status: false,
        message: "Pitak ID is required",
        data: { errors: ["Missing pitakId parameter"] },
      };
    }

    // Validate pitak exists
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const pitak = await pitakRepo.findOne({ where: { id: pitakId } });

    if (!pitak) {
      return {
        status: false,
        message: "Pitak not found",
        data: { errors: [`Pitak ${pitakId} not found`] },
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.session", "session")
      .where("assignment.pitakId = :pitakId", { pitakId })
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

    // Apply status filter
    // @ts-ignore
    if (filters.status) {
      queryBuilder.andWhere("assignment.status = :status", {
        // @ts-ignore
        status: filters.status,
      });
    }

    const assignments = await queryBuilder.getMany();

    // Calculate pitak statistics
    const stats = {
      totalAssignments: assignments.length,
      totalLuWang: 0,
      averageLuWang: 0,
      uniqueWorkers: new Set(),
      byStatus: { active: 0, completed: 0, cancelled: 0 },
      workerPerformance: {},
    };

    const formattedAssignments = assignments.map((assignment) => {
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // Update stats
      stats.totalLuWang += luwang;
      // @ts-ignore
      stats.uniqueWorkers.add(assignment.worker?.id);
      // @ts-ignore
      stats.byStatus[assignment.status]++;

      // Track worker performance
      // @ts-ignore
      const wid = assignment.worker?.id;
      if (wid) {
        // @ts-ignore
        if (!stats.workerPerformance[wid]) {
          // @ts-ignore
          stats.workerPerformance[wid] = {
            workerId: wid,
            // @ts-ignore
            workerName: assignment.worker?.name || "Unknown",
            assignments: 0,
            totalLuWang: 0,
          };
        }
        // @ts-ignore
        stats.workerPerformance[wid].assignments++;
        // @ts-ignore
        stats.workerPerformance[wid].totalLuWang += luwang;
      }

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
    // @ts-ignore
    stats.uniqueWorkers = stats.uniqueWorkers.size;

    // Convert workerPerformance to array and sort by totalLuWang
    stats.workerPerformance = Object.values(stats.workerPerformance)
      .map((worker) => ({
        ...worker,
        totalLuWang: worker.totalLuWang.toFixed(2),
        averageLuWang: (worker.totalLuWang / worker.assignments).toFixed(2),
      }))
      .sort((a, b) => b.totalLuWang - a.totalLuWang);

    return {
      status: true,
      // @ts-ignore
      message: `Assignments for pitak '${pitak.name}' retrieved successfully`,
      data: {
        pitak: {
          id: pitak.id,
          // @ts-ignore
          name: pitak.name,
          location: pitak.location,
          status: pitak.status,
        },
        assignments: formattedAssignments,
        statistics: stats,
      },
      meta: { sessionId: currentSessionId },
    };
  } catch (error) {
    console.error("Error getting assignments by pitak:", error);
    return {
      status: false,
      message: "Failed to retrieve assignments",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
