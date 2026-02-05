// src/ipc/pitak/get/performance.ipc
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (
  /** @type {any} */ pitakId,
  dateRange = {},
  // @ts-ignore
  /** @type {any} */ userId,
) => {
  try {
    if (!pitakId) {
      return { status: false, message: "Pitak ID is required", data: null };
    }

    const pitakRepo = AppDataSource.getRepository(Pitak);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const currentSessionId = await farmSessionDefaultSessionId();
    // Get pitak details
    const pitak = await pitakRepo.findOne({
      where: {
        id: pitakId,
        // @ts-ignore
        bukid: { session: { id: currentSessionId } },
      },
      relations: ["bukid", "bukid.session"],
    });

    if (!pitak) {
      return { status: false, message: "Pitak not found", data: null };
    }

    // @ts-ignore
    const { startDate, endDate } = dateRange;
    const hasDateRange = startDate && endDate;

    // Build assignment query with session filter
    const assignmentQuery = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .innerJoin("assignment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .where("assignment.pitakId = :pitakId", { pitakId })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // Build payment query with session filter
    const paymentQuery = paymentRepo
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .innerJoin("payment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .where("payment.pitakId = :pitakId", { pitakId })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });
    // Apply date range if provided
    if (hasDateRange) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      assignmentQuery.andWhere(
        "assignment.assignmentDate BETWEEN :startDate AND :endDate",
        {
          startDate: start,
          endDate: end,
        },
      );

      paymentQuery.andWhere(
        "payment.paymentDate BETWEEN :startDate AND :endDate",
        {
          startDate: start,
          endDate: end,
        },
      );
    }

    // Get assignments and payments
    const [assignments, payments] = await Promise.all([
      assignmentQuery.getMany(),
      paymentQuery.getMany(),
    ]);

    // Calculate assignment metrics
    const assignmentMetrics = {
      total: assignments.length,
      // @ts-ignore
      totalLuWang: assignments.reduce(
        // @ts-ignore
        (sum, a) => sum + parseFloat(a.luwangCount),
        0,
      ),
      completed: assignments.filter((a) => a.status === "completed").length,
      active: assignments.filter((a) => a.status === "active").length,
      cancelled: assignments.filter((a) => a.status === "cancelled").length,
    };

    // Calculate payment metrics
    const paymentMetrics = {
      total: payments.length,
      // @ts-ignore
      totalGrossPay: payments.reduce(
        // @ts-ignore
        (sum, p) => sum + parseFloat(p.grossPay),
        0,
      ),
      // @ts-ignore
      totalNetPay: payments.reduce((sum, p) => sum + parseFloat(p.netPay), 0),
      // @ts-ignore
      totalDebtDeduction: payments.reduce(
        // @ts-ignore
        (sum, p) => sum + parseFloat(p.totalDebtDeduction || 0),
        0,
      ),
      completed: payments.filter((p) => p.status === "completed").length,
      pending: payments.filter((p) => p.status === "pending").length,
    };

    // Calculate worker performance
    const workerPerformance = {};
    assignments.forEach((assignment) => {
      // @ts-ignore
      const workerId = assignment.workerId;
      if (!workerId) return;

      // @ts-ignore
      if (!workerPerformance[workerId]) {
        // @ts-ignore
        workerPerformance[workerId] = {
          workerId,
          // @ts-ignore
          workerName: assignment.worker ? assignment.worker.name : "Unknown",
          assignments: 0,
          totalLuWang: 0,
          averageLuWang: 0,
          payments: 0,
          totalEarnings: 0,
        };
      }

      // @ts-ignore
      workerPerformance[workerId].assignments++;
      // @ts-ignore
      workerPerformance[workerId].totalLuWang += parseFloat(
        // @ts-ignore
        assignment.luwangCount,
      );
    });

    // Add payment data to worker performance
    payments.forEach((payment) => {
      // @ts-ignore
      const workerId = payment.workerId;
      // @ts-ignore
      if (!workerId || !workerPerformance[workerId]) return;

      // @ts-ignore
      workerPerformance[workerId].payments++;
      // @ts-ignore
      workerPerformance[workerId].totalEarnings += parseFloat(payment.netPay);
    });

    // Calculate averages for workers
    Object.values(workerPerformance).forEach((worker) => {
      worker.averageLuWang =
        worker.assignments > 0 ? worker.totalLuWang / worker.assignments : 0;
      worker.averageEarnings =
        worker.payments > 0 ? worker.totalEarnings / worker.payments : 0;
      worker.earningsPerLuWang =
        worker.totalLuWang > 0 ? worker.totalEarnings / worker.totalLuWang : 0;
    });

    const topWorkers = Object.values(workerPerformance)
      .sort((a, b) => b.totalLuWang - a.totalLuWang)
      .slice(0, 10);

    // Calculate daily performance
    const dailyPerformance = {};
    assignments.forEach((assignment) => {
      // @ts-ignore
      const date = assignment.assignmentDate.toISOString().split("T")[0];
      // @ts-ignore
      if (!dailyPerformance[date]) {
        // @ts-ignore
        dailyPerformance[date] = {
          date,
          assignments: 0,
          totalLuWang: 0,
          workers: new Set(),
        };
      }
      // @ts-ignore
      dailyPerformance[date].assignments++;
      // @ts-ignore
      dailyPerformance[date].totalLuWang += parseFloat(assignment.luwangCount);
      // @ts-ignore
      if (assignment.workerId) {
        // @ts-ignore
        dailyPerformance[date].workers.add(assignment.workerId);
      }
    });

    const dailyPerformanceArray = Object.values(dailyPerformance)
      .map((day) => ({
        date: day.date,
        assignments: day.assignments,
        totalLuWang: day.totalLuWang,
        uniqueWorkers: day.workers.size,
        averageLuWangPerAssignment:
          day.assignments > 0 ? day.totalLuWang / day.assignments : 0,
        // @ts-ignore
      }))
      // @ts-ignore
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate utilization metrics
    // @ts-ignore
    const totalLuWangCapacity = parseFloat(pitak.totalLuwang);
    // @ts-ignore
    const daysInPeriod = hasDateRange
      ? Math.ceil(
          // @ts-ignore
          (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
        )
      : 30;
    const totalCapacity = totalLuWangCapacity * daysInPeriod;
    const utilizationRate =
      totalCapacity > 0
        ? (assignmentMetrics.totalLuWang / totalCapacity) * 100
        : 0;

    // Calculate efficiency metrics
    const revenuePerLuWang =
      assignmentMetrics.totalLuWang > 0
        ? paymentMetrics.totalNetPay / assignmentMetrics.totalLuWang
        : 0;

    const assignmentsPerPayment =
      paymentMetrics.total > 0
        ? assignmentMetrics.total / paymentMetrics.total
        : 0;

    // Calculate trend (last 7 days vs previous 7 days)
    let growthRate = 0;
    if (hasDateRange) {
      const midpoint = new Date(startDate);
      midpoint.setDate(midpoint.getDate() + Math.floor(daysInPeriod / 2));

      const firstHalfAssignments = assignments.filter(
        (a) =>
          // @ts-ignore
          new Date(a.assignmentDate) < midpoint,
      ).length;

      const secondHalfAssignments = assignments.filter(
        (a) =>
          // @ts-ignore
          new Date(a.assignmentDate) >= midpoint,
      ).length;

      growthRate =
        firstHalfAssignments > 0
          ? ((secondHalfAssignments - firstHalfAssignments) /
              firstHalfAssignments) *
            100
          : 0;
    }

    return {
      status: true,
      message: "Pitak performance report retrieved successfully",
      data: {
        pitak: {
          id: pitak.id,
          location: pitak.location,
          totalLuwang: totalLuWangCapacity,
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
        period: hasDateRange
          ? dateRange
          : {
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              endDate: new Date().toISOString().split("T")[0],
              days: 30,
            },
        metrics: {
          assignments: assignmentMetrics,
          payments: paymentMetrics,
          utilization: {
            rate: utilizationRate,
            capacityUsed: assignmentMetrics.totalLuWang,
            capacityAvailable: totalCapacity,
            dailyAverage: assignmentMetrics.totalLuWang / daysInPeriod,
          },
          efficiency: {
            revenuePerLuWang,
            assignmentsPerPayment,
            averageLuWangPerAssignment:
              assignmentMetrics.total > 0
                ? assignmentMetrics.totalLuWang / assignmentMetrics.total
                : 0,
            averageNetPayPerPayment:
              paymentMetrics.total > 0
                ? paymentMetrics.totalNetPay / paymentMetrics.total
                : 0,
            deductionRate:
              paymentMetrics.totalGrossPay > 0
                ? (paymentMetrics.totalDebtDeduction /
                    paymentMetrics.totalGrossPay) *
                  100
                : 0,
          },
        },
        workers: {
          total: Object.keys(workerPerformance).length,
          topPerformers: topWorkers,
          averagePerformance: {
            averageLuWang:
              assignmentMetrics.total > 0
                ? assignmentMetrics.totalLuWang / assignmentMetrics.total
                : 0,
            averageAssignmentsPerWorker:
              Object.keys(workerPerformance).length > 0
                ? assignmentMetrics.total /
                  Object.keys(workerPerformance).length
                : 0,
          },
        },
        dailyPerformance: dailyPerformanceArray,
        trends: {
          growthRate,
          performanceTrend: calculatePerformanceTrend(dailyPerformanceArray),
          workerRetention: calculateWorkerRetention(assignments, payments),
        },
        recommendations: generateRecommendations(
          utilizationRate,
          revenuePerLuWang,
          assignmentMetrics,
          paymentMetrics,
        ),
      },
    };
  } catch (error) {
    console.error("Error retrieving pitak performance:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pitak performance: ${error.message}`,
      data: null,
    };
  }
};

// Helper functions
/**
 * @param {string | any[]} dailyPerformance
 */
function calculatePerformanceTrend(dailyPerformance) {
  if (dailyPerformance.length < 2) return "stable";

  const lastWeek = dailyPerformance.slice(-7);
  const previousWeek = dailyPerformance.slice(-14, -7);

  if (lastWeek.length === 0 || previousWeek.length === 0)
    return "insufficient_data";

  // @ts-ignore
  const lastWeekAvg =
    // @ts-ignore
    lastWeek.reduce(
      (/** @type {any} */ sum, /** @type {{ totalLuWang: any; }} */ day) =>
        sum + day.totalLuWang,
      0,
    ) / lastWeek.length;
  // @ts-ignore
  const previousWeekAvg =
    // @ts-ignore
    previousWeek.reduce(
      (/** @type {any} */ sum, /** @type {{ totalLuWang: any; }} */ day) =>
        sum + day.totalLuWang,
      0,
    ) / previousWeek.length;

  if (lastWeekAvg > previousWeekAvg * 1.2) return "improving";
  if (lastWeekAvg < previousWeekAvg * 0.8) return "declining";
  return "stable";
}

/**
 * @param {any[]} assignments
 * @param {{ id: unknown; grossPay: unknown; manualDeduction: unknown; netPay: unknown; status: unknown; paymentDate: unknown; paymentMethod: unknown; referenceNumber: unknown; periodStart: unknown; periodEnd: unknown; totalDebtDeduction: unknown; otherDeductions: unknown; deductionBreakdown: unknown; notes: unknown; createdAt: unknown; updatedAt: unknown; }[]} payments
 */
// @ts-ignore
// @ts-ignore
function calculateWorkerRetention(assignments, payments) {
  if (assignments.length === 0) return 0;

  const workerAssignments = {};
  assignments.forEach(
    (/** @type {{ workerId: string | number; assignmentDate: any; }} */ a) => {
      if (a.workerId) {
        // @ts-ignore
        if (!workerAssignments[a.workerId]) {
          // @ts-ignore
          workerAssignments[a.workerId] = [];
        }
        // @ts-ignore
        workerAssignments[a.workerId].push(a.assignmentDate);
      }
    },
  );

  const workersWithMultiple = Object.values(workerAssignments).filter(
    (dates) => dates.length >= 2,
  ).length;

  return (workersWithMultiple / Object.keys(workerAssignments).length) * 100;
}

/**
 * @param {number} utilizationRate
 * @param {number} revenuePerLuWang
 * @param {{ total?: number; totalLuWang?: number; completed: any; active: any; cancelled?: number; }} assignments
 * @param {{ total?: number; totalGrossPay?: number; totalNetPay?: number; totalDebtDeduction?: number; completed: any; pending: any; }} payments
 */
function generateRecommendations(
  utilizationRate,
  revenuePerLuWang,
  assignments,
  payments,
) {
  const recommendations = [];

  if (utilizationRate < 50) {
    recommendations.push({
      type: "low_utilization",
      priority: "medium",
      message:
        "Pitak utilization is below 50%. Consider increasing assignments or reducing capacity.",
      action: "Review assignment scheduling and marketing strategies.",
    });
  }

  if (utilizationRate > 90) {
    recommendations.push({
      type: "high_utilization",
      priority: "high",
      message:
        "Pitak utilization is above 90%. Consider expanding capacity or limiting new assignments.",
      action: "Evaluate capacity expansion or implement assignment limits.",
    });
  }

  if (revenuePerLuWang < 50) {
    recommendations.push({
      type: "low_revenue_efficiency",
      priority: "medium",
      message: "Revenue per LuWang is below optimal levels.",
      action: "Review pricing strategy or consider value-added services.",
    });
  }

  if (assignments.active > assignments.completed * 0.3) {
    recommendations.push({
      type: "high_active_assignments",
      priority: "high",
      message: "High number of active assignments compared to completed ones.",
      action: "Follow up on pending assignments and improve completion rates.",
    });
  }

  if (payments.pending > payments.completed * 0.2) {
    recommendations.push({
      type: "high_pending_payments",
      priority: "medium",
      message: "High number of pending payments.",
      action:
        "Improve payment collection process and follow up on overdue payments.",
    });
  }

  return recommendations;
}
