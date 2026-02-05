// src/ipc/assignment/get/worker_performance.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
const Worker = require("../../../../entities/Worker");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Generate worker performance report scoped to current session
 * @param {number} workerId - Worker ID (optional, if not provided, all workers)
 * @param {Object} dateRange - Date range for report
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (workerId, dateRange, userId) => {
  try {
    // @ts-ignore
    const { startDate, endDate } = dateRange || {};

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const workerRepo = AppDataSource.getRepository(Worker);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Build base query
    let queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply date filter if provided
    if (startDate && endDate) {
      queryBuilder.andWhere("assignment.assignmentDate BETWEEN :startDate AND :endDate", {
        startDate,
        endDate
      });
    }

    // Apply worker filter if provided
    if (workerId) {
      queryBuilder.andWhere("worker.id = :workerId", { workerId });

      const worker = await workerRepo.findOne({ where: { id: workerId } });
      if (!worker) {
        return {
          status: false,
          message: "Worker not found",
          data: { errors: [`Worker ${workerId} not found`] }
        };
      }
    }

    const assignments = await queryBuilder.getMany();

    // Group assignments by worker
    const workerPerformance = {};

    assignments.forEach((assignment) => {
      // @ts-ignore
      const worker = assignment.worker;
      if (!worker) return;

      const wid = worker.id;
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      // @ts-ignore
      if (!workerPerformance[wid]) {
        // @ts-ignore
        workerPerformance[wid] = {
          worker: {
            id: worker.id,
            name: worker.name,
            contactNumber: worker.contactNumber || null
          },
          totalAssignments: 0,
          activeAssignments: 0,
          completedAssignments: 0,
          cancelledAssignments: 0,
          totalLuWang: 0,
          averageLuWang: 0,
          assignmentsByDate: {},
          pitaksWorked: new Set(),
          performanceMetrics: {
            completionRate: 0,
            averageLuWangPerDay: 0,
            consistencyScore: 0
          }
        };
      }

      // @ts-ignore
      const performance = workerPerformance[wid];
      performance.totalAssignments++;
      performance.totalLuWang += luwang;
      // @ts-ignore
      performance.pitaksWorked.add(assignment.pitak?.id);

      if (assignment.status === "active") performance.activeAssignments++;
      if (assignment.status === "completed") performance.completedAssignments++;
      if (assignment.status === "cancelled") performance.cancelledAssignments++;

      // @ts-ignore
      const dateStr = assignment.assignmentDate.toISOString().split("T")[0];
      if (!performance.assignmentsByDate[dateStr]) {
        performance.assignmentsByDate[dateStr] = {
          date: dateStr,
          assignments: 0,
          totalLuWang: 0
        };
      }
      performance.assignmentsByDate[dateStr].assignments++;
      performance.assignmentsByDate[dateStr].totalLuWang += luwang;
    });

    // Calculate performance metrics for each worker
    Object.values(workerPerformance).forEach((performance) => {
      if (performance.totalAssignments > 0) {
        performance.averageLuWang = (
          performance.totalLuWang / performance.totalAssignments
        ).toFixed(2);
      }
      performance.totalLuWang = performance.totalLuWang.toFixed(2);
      performance.pitaksWorked = performance.pitaksWorked.size;

      if (performance.totalAssignments > 0) {
        performance.performanceMetrics.completionRate = (
          (performance.completedAssignments / performance.totalAssignments) * 100
        ).toFixed(2);
      }

      const workingDays = Object.keys(performance.assignmentsByDate).length;
      if (workingDays > 0) {
        performance.performanceMetrics.averageLuWangPerDay = (
          parseFloat(performance.totalLuWang) / workingDays
        ).toFixed(2);
      }

      const dailyAverages = Object.values(performance.assignmentsByDate).map(
        (day) => day.totalLuWang / day.assignments
      );

      if (dailyAverages.length > 1) {
        const mean = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;
        const variance =
          dailyAverages.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
          dailyAverages.length;
        performance.performanceMetrics.consistencyScore = (
          (Math.sqrt(variance) / mean) * 100
        ).toFixed(2);
      }

      performance.assignmentsByDate = Object.values(performance.assignmentsByDate).sort(
        // @ts-ignore
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    });

    const performanceArray = Object.values(workerPerformance).sort(
      (a, b) => parseFloat(b.totalLuWang) - parseFloat(a.totalLuWang)
    );

    const totalLuWangAll = assignments
      // @ts-ignore
      .reduce((sum, a) => sum + parseFloat(a.luwangCount || 0), 0)
      .toFixed(2);

    const overallStats = {
      totalWorkers: performanceArray.length,
      totalAssignments: assignments.length,
      totalLuWang: totalLuWangAll,
      averageLuWangPerWorker:
        performanceArray.length > 0
          ? (parseFloat(totalLuWangAll) / performanceArray.length).toFixed(2)
          : "0.00",
      topPerformers: performanceArray.slice(0, 5).map((w) => ({
        name: w.worker.name,
        totalLuWang: w.totalLuWang,
        completionRate: w.performanceMetrics.completionRate
      }))
    };

    return {
      status: true,
      message: workerId
        ? "Worker performance report generated successfully"
        : "All workers performance report generated successfully",
      data: { report: performanceArray, summary: overallStats },
      meta: {
        dateRange: startDate && endDate ? { startDate, endDate } : "All time",
        workerFilter: workerId ? workerId : "All workers",
        sessionId: currentSessionId
      }
    };
  } catch (error) {
    console.error("Error generating worker performance report:", error);
    return {
      status: false,
      message: "Failed to generate performance report",
      // @ts-ignore
      data: { errors: [error.message || String(error)] }
    };
  }
};