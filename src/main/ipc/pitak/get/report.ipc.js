// src/ipc/pitak/get/report.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (dateRange = {}, filters = {}, userId) => {
  try {
    // @ts-ignore
    const { startDate, endDate } = dateRange;

    if (!startDate || !endDate) {
      return {
        status: false,
        message: "Start date and end date are required for the report",
        data: null,
      };
    }

    const pitakRepo = AppDataSource.getRepository(Pitak);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Build base query for pitaks with session filter
    const pitakQuery = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session")
      .where("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply filters
    // @ts-ignore
    if (filters.bukidId) {
      pitakQuery.andWhere("pitak.bukidId = :bukidId", {
        // @ts-ignore
        bukidId: filters.bukidId,
      });
    }

    // @ts-ignore
    if (filters.status) {
      // @ts-ignore
      pitakQuery.andWhere("pitak.status = :status", { status: filters.status });
    }

    const pitaks = await pitakQuery.getMany();

    // Generate detailed report for each pitak
    const reportData = await Promise.all(
      pitaks.map(async (pitak) => {
        // Get assignments within date range with session filter
        const assignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .leftJoinAndSelect("assignment.worker", "worker")
          .innerJoin("assignment.pitak", "pitak")
          .innerJoin("pitak.bukid", "bukid")
          .innerJoin("bukid.session", "session")
          .where("assignment.pitakId = :pitakId", { pitakId: pitak.id })
          .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
          .andWhere(
            "assignment.assignmentDate BETWEEN :startDate AND :endDate",
            {
              startDate: new Date(startDate),
              endDate: new Date(endDate),
            },
          );

        // @ts-ignore
        if (filters.workerId) {
          assignmentsQuery.andWhere("assignment.workerId = :workerId", {
            // @ts-ignore
            workerId: filters.workerId,
          });
        }

        const assignments = await assignmentsQuery.getMany();

        // Get payments within date range with session filter
        const paymentsQuery = paymentRepo
          .createQueryBuilder("payment")
          .leftJoinAndSelect("payment.worker", "worker")
          .innerJoin("payment.pitak", "pitak")
          .innerJoin("pitak.bukid", "bukid")
          .innerJoin("bukid.session", "session")
          .where("payment.pitakId = :pitakId", { pitakId: pitak.id })
          .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
          .andWhere("payment.paymentDate BETWEEN :startDate AND :endDate", {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          });

        // @ts-ignore
        if (filters.workerId) {
          paymentsQuery.andWhere("payment.workerId = :workerId", {
            // @ts-ignore
            workerId: filters.workerId,
          });
        }

        const payments = await paymentsQuery.getMany();

        // Calculate metrics
        const assignmentStats = assignments.reduce(
          (stats, assignment) => {
            // @ts-ignore
            stats.totalLuWang += parseFloat(assignment.luwangCount) || 0;
            stats.completedCount += assignment.status === "completed" ? 1 : 0;
            stats.activeCount += assignment.status === "active" ? 1 : 0;
            stats.cancelledCount += assignment.status === "cancelled" ? 1 : 0;
            return stats;
          },
          {
            totalAssignments: assignments.length,
            totalLuWang: 0,
            completedCount: 0,
            activeCount: 0,
            cancelledCount: 0,
          },
        );

        const paymentStats = payments.reduce(
          (stats, payment) => {
            // @ts-ignore
            stats.totalGrossPay += parseFloat(payment.grossPay) || 0;
            // @ts-ignore
            stats.totalNetPay += parseFloat(payment.netPay) || 0;
            stats.totalDebtDeduction +=
              // @ts-ignore
              parseFloat(payment.totalDebtDeduction) || 0;
            stats.completedCount += payment.status === "completed" ? 1 : 0;
            return stats;
          },
          {
            totalPayments: payments.length,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDebtDeduction: 0,
            completedCount: 0,
          },
        );

        return {
          pitak: {
            id: pitak.id,
            location: pitak.location,
            // @ts-ignore
            totalLuwang: parseFloat(pitak.totalLuwang),
            status: pitak.status,
            // @ts-ignore
            bukid: pitak.bukid
              ? {
                  // @ts-ignore
                  id: pitak.bukid.id,
                  // @ts-ignore
                  name: pitak.bukid.name,
                }
              : null,
          },
          assignmentMetrics: assignmentStats,
          paymentMetrics: paymentStats,
          assignments: assignments.map((a) => ({
            id: a.id,
            assignmentDate: a.assignmentDate,
            // @ts-ignore
            luwangCount: parseFloat(a.luwangCount),
            status: a.status,
            // @ts-ignore
            worker: a.worker
              ? {
                  // @ts-ignore
                  id: a.worker.id,
                  // @ts-ignore
                  name: a.worker.name,
                }
              : null,
          })),
          payments: payments.map((p) => ({
            id: p.id,
            paymentDate: p.paymentDate,
            // @ts-ignore
            grossPay: parseFloat(p.grossPay),
            // @ts-ignore
            netPay: parseFloat(p.netPay),
            status: p.status,
            // @ts-ignore
            worker: p.worker
              ? {
                  // @ts-ignore
                  id: p.worker.id,
                  // @ts-ignore
                  name: p.worker.name,
                }
              : null,
          })),
        };
      }),
    );

    // Calculate summary totals
    const summary = reportData.reduce(
      (totals, item) => {
        totals.totalPitaks++;
        // @ts-ignore
        totals.totalLuWangCapacity += parseFloat(item.pitak.totalLuwang);
        totals.totalAssignments += item.assignmentMetrics.totalAssignments;
        totals.totalLuWangAssigned += item.assignmentMetrics.totalLuWang;
        totals.totalPayments += item.paymentMetrics.totalPayments;
        totals.totalGrossPay += item.paymentMetrics.totalGrossPay;
        totals.totalNetPay += item.paymentMetrics.totalNetPay;

        // Count by status
        if (item.pitak.status === "active") totals.activePitaks++;
        if (item.pitak.status === "inactive") totals.inactivePitaks++;
        if (item.pitak.status === "completed") totals.harvestedPitaks++;

        return totals;
      },
      {
        totalPitaks: 0,
        activePitaks: 0,
        inactivePitaks: 0,
        harvestedPitaks: 0,
        totalLuWangCapacity: 0,
        totalAssignments: 0,
        totalLuWangAssigned: 0,
        totalPayments: 0,
        totalGrossPay: 0,
        totalNetPay: 0,
      },
    );

    // Calculate utilization rate
    // @ts-ignore
    summary.utilizationRate =
      summary.totalLuWangCapacity > 0
        ? (summary.totalLuWangAssigned / summary.totalLuWangCapacity) * 100
        : 0;

    return {
      status: true,
      message: "Pitak report generated successfully",
      data: {
        period: { startDate, endDate },
        filters,
        summary,
        detailedData: reportData,
        generatedAt: new Date(),
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error generating pitak report:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to generate pitak report: ${error.message}`,
      data: null,
    };
  }
};
