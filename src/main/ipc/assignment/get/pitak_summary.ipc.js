// src/ipc/assignment/get/pitak_summary.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
const Pitak = require("../../../../entities/Pitak");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Generate pitak summary report scoped to current session
 * @param {number} pitakId - Pitak ID (optional, if not provided, all pitaks)
 * @param {Object} dateRange - Date range for report
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (pitakId, dateRange, userId) => {
  try {
    // @ts-ignore
    const { startDate, endDate } = dateRange || {};

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Get pitak details if specific pitak is requested
    let pitakDetails = null;
    if (pitakId) {
      pitakDetails = await pitakRepo.findOne({ where: { id: pitakId } });
      if (!pitakDetails) {
        return {
          status: false,
          message: "Pitak not found",
          data: { errors: [`Pitak ${pitakId} not found`] },
        };
      }
    }

    // Build query
    let queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.session", "session")
      .where("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply date filter
    if (startDate && endDate) {
      queryBuilder.andWhere(
        "assignment.assignmentDate BETWEEN :startDate AND :endDate",
        { startDate, endDate },
      );
    }

    // Apply pitak filter
    if (pitakId) {
      queryBuilder.andWhere("pitak.id = :pitakId", { pitakId });
    }

    const assignments = await queryBuilder.getMany();

    // Group assignments by pitak
    const pitakSummaries = {};

    assignments.forEach((assignment) => {
      // @ts-ignore
      const pitak = assignment.pitak;
      if (!pitak) return;

      const pid = pitak.id;
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // @ts-ignore
      if (!pitakSummaries[pid]) {
        // @ts-ignore
        pitakSummaries[pid] = {
          pitak: {
            id: pitak.id,
            name: pitak.name,
            location: pitak.location,
          },
          totalAssignments: 0,
          totalLuWang: 0,
          averageLuWang: 0,
          uniqueWorkers: new Set(),
          assignmentsByDate: {},
          assignmentsByStatus: { active: 0, completed: 0, cancelled: 0 },
          workerPerformance: {},
          utilizationMetrics: {
            assignmentDays: 0,
            workerDays: 0,
            utilizationRate: 0,
          },
        };
      }

      // @ts-ignore
      const summary = pitakSummaries[pid];
      summary.totalAssignments++;
      summary.totalLuWang += luwang;
      // @ts-ignore
      summary.uniqueWorkers.add(assignment.worker?.id);
      summary.assignmentsByStatus[assignment.status]++;

      // Track worker performance
      // @ts-ignore
      if (assignment.worker) {
        // @ts-ignore
        const wid = assignment.worker.id;
        if (!summary.workerPerformance[wid]) {
          summary.workerPerformance[wid] = {
            workerId: wid,
            // @ts-ignore
            workerName: assignment.worker.name,
            assignments: 0,
            totalLuWang: 0,
          };
        }
        summary.workerPerformance[wid].assignments++;
        summary.workerPerformance[wid].totalLuWang += luwang;
      }

      // Group by date
      // @ts-ignore
      const dateStr = assignment.assignmentDate.toISOString().split("T")[0];
      if (!summary.assignmentsByDate[dateStr]) {
        summary.assignmentsByDate[dateStr] = {
          date: dateStr,
          assignments: 0,
          workers: new Set(),
          totalLuWang: 0,
        };
      }
      summary.assignmentsByDate[dateStr].assignments++;
      // @ts-ignore
      summary.assignmentsByDate[dateStr].workers.add(assignment.worker?.id);
      summary.assignmentsByDate[dateStr].totalLuWang += luwang;
    });

    // Calculate metrics for each pitak
    Object.values(pitakSummaries).forEach((summary) => {
      if (summary.totalAssignments > 0) {
        summary.averageLuWang = (
          summary.totalLuWang / summary.totalAssignments
        ).toFixed(2);
      }
      summary.totalLuWang = summary.totalLuWang.toFixed(2);
      summary.uniqueWorkers = summary.uniqueWorkers.size;

      const assignmentDays = Object.keys(summary.assignmentsByDate).length;
      summary.utilizationMetrics.assignmentDays = assignmentDays;

      let totalWorkerDays = 0;
      Object.values(summary.assignmentsByDate).forEach((day) => {
        totalWorkerDays += day.workers.size;
      });
      summary.utilizationMetrics.workerDays = totalWorkerDays;

      if (assignmentDays > 0 && summary.uniqueWorkers > 0) {
        const maxPossibleWorkerDays = assignmentDays * summary.uniqueWorkers;
        summary.utilizationMetrics.utilizationRate = (
          (totalWorkerDays / maxPossibleWorkerDays) *
          100
        ).toFixed(2);
      }

      summary.assignmentsByDate = Object.values(summary.assignmentsByDate)
        .map((day) => ({
          ...day,
          workers: day.workers.size,
          averageLuWangPerWorker: (day.totalLuWang / day.workers.size).toFixed(
            2,
          ),
        }))
        // @ts-ignore
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      summary.workerPerformance = Object.values(summary.workerPerformance)
        .map((worker) => ({
          ...worker,
          totalLuWang: worker.totalLuWang.toFixed(2),
          averageLuWang: (worker.totalLuWang / worker.assignments).toFixed(2),
        }))
        .sort((a, b) => parseFloat(b.totalLuWang) - parseFloat(a.totalLuWang))
        .slice(0, 10);
    });

    const summaryArray = Object.values(pitakSummaries).sort(
      (a, b) => parseFloat(b.totalLuWang) - parseFloat(a.totalLuWang),
    );

    const overallStats = {
      totalPitaks: summaryArray.length,
      totalAssignments: assignments.length,
      totalLuWang: assignments
        // @ts-ignore
        .reduce((sum, a) => sum + parseFloat(a.luwangCount || 0), 0)
        .toFixed(2),
      // @ts-ignore
      uniqueWorkers: new Set(assignments.map((a) => a.worker?.id)).size,
      mostProductivePitak:
        summaryArray.length > 0 ? summaryArray[0].pitak.name : "N/A",
      averageUtilizationRate:
        summaryArray.length > 0
          ? (
              summaryArray.reduce(
                (sum, p) =>
                  sum + parseFloat(p.utilizationMetrics.utilizationRate || 0),
                0,
              ) / summaryArray.length
            ).toFixed(2)
          : "0.00",
    };

    return {
      status: true,
      message: pitakId
        ? "Pitak summary report generated successfully"
        : "All pitaks summary report generated successfully",
      data: { report: summaryArray, summary: overallStats },
      meta: {
        dateRange: startDate && endDate ? { startDate, endDate } : "All time",
        pitakFilter: pitakId ? pitakId : "All pitaks",
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error generating pitak summary report:", error);
    return {
      status: false,
      message: "Failed to generate pitak summary",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
