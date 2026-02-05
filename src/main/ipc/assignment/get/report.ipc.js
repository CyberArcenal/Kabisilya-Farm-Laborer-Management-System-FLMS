// src/ipc/assignment/get/report.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
// @ts-ignore
const Worker = require("../../../../entities/Worker");
// @ts-ignore
const Pitak = require("../../../../entities/Pitak");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Generate assignment report scoped to current session
 * @param {Object} dateRange - Date range for report
 * @param {Object} filters - Additional filters
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (dateRange, filters = {}, userId) => {
  try {
    // @ts-ignore
    const { startDate, endDate } = dateRange || {};

    if (!startDate || !endDate) {
      return {
        status: false,
        message: "Date range (startDate and endDate) is required for report",
        data: { errors: ["Missing date range parameters"] },
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Build base query
    const queryBuilder = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .leftJoinAndSelect("assignment.pitak", "pitak")
      .leftJoinAndSelect("assignment.session", "session")
      .where("assignment.assignmentDate BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply additional filters
    // @ts-ignore
    if (filters.status) {
      queryBuilder.andWhere("assignment.status = :status", {
        // @ts-ignore
        status: filters.status,
      });
    }

    // @ts-ignore
    if (filters.workerId) {
      queryBuilder.andWhere("worker.id = :workerId", {
        // @ts-ignore
        workerId: filters.workerId,
      });
    }

    // @ts-ignore
    if (filters.pitakId) {
      queryBuilder.andWhere("pitak.id = :pitakId", {
        // @ts-ignore
        pitakId: filters.pitakId,
      });
    }

    const assignments = await queryBuilder
      .orderBy("assignment.assignmentDate", "DESC")
      .addOrderBy("worker.name", "ASC")
      .getMany();

    // Calculate summary statistics
    const summary = {
      totalAssignments: assignments.length,
      totalLuWang: 0,
      byStatus: { active: 0, completed: 0, cancelled: 0 },
      byWorker: {},
      byPitak: {},
    };

    const reportData = assignments.map((assignment) => {
      // @ts-ignore
      const luwang = parseFloat(assignment.luwangCount) || 0;

      summary.totalLuWang += luwang;
      // @ts-ignore
      summary.byStatus[assignment.status] =
        // @ts-ignore
        (summary.byStatus[assignment.status] || 0) + 1;

      // @ts-ignore
      if (assignment.worker) {
        // @ts-ignore
        const workerId = assignment.worker.id;
        // @ts-ignore
        if (!summary.byWorker[workerId]) {
          // @ts-ignore
          summary.byWorker[workerId] = {
            // @ts-ignore
            name: assignment.worker.name,
            totalAssignments: 0,
            totalLuWang: 0,
          };
        }
        // @ts-ignore
        summary.byWorker[workerId].totalAssignments++;
        // @ts-ignore
        summary.byWorker[workerId].totalLuWang += luwang;
      }

      // @ts-ignore
      if (assignment.pitak) {
        // @ts-ignore
        const pitakId = assignment.pitak.id;
        // @ts-ignore
        if (!summary.byPitak[pitakId]) {
          // @ts-ignore
          summary.byPitak[pitakId] = {
            // @ts-ignore
            name: assignment.pitak.name,
            totalAssignments: 0,
            totalLuWang: 0,
          };
        }
        // @ts-ignore
        summary.byPitak[pitakId].totalAssignments++;
        // @ts-ignore
        summary.byPitak[pitakId].totalLuWang += luwang;
      }

      return {
        id: assignment.id,
        date: assignment.assignmentDate,
        luwangCount: luwang.toFixed(2),
        status: assignment.status,
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
      };
    });

    summary.byWorker = Object.values(summary.byWorker).sort(
      (a, b) => b.totalLuWang - a.totalLuWang,
    );
    summary.byPitak = Object.values(summary.byPitak).sort(
      (a, b) => b.totalLuWang - a.totalLuWang,
    );
    // @ts-ignore
    summary.totalLuWang = summary.totalLuWang.toFixed(2);

    return {
      status: true,
      message: "Assignment report generated successfully",
      data: {
        report: reportData,
        summary,
        dateRange: {
          startDate,
          endDate,
          duration: `${reportData.length} records`,
        },
      },
      meta: { sessionId: currentSessionId },
    };
  } catch (error) {
    console.error("Error generating assignment report:", error);
    return {
      status: false,
      message: "Failed to generate report",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
