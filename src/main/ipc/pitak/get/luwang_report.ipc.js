// src/ipc/pitak/get/luwang_report.ipc
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
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

    // Build assignment query
    const assignmentQuery = assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.worker", "worker")
      .innerJoin("assignment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .where("assignment.pitakId = :pitakId", { pitakId })
      .andWhere("assignment.status = :status", { status: "completed" })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply date range if provided
    if (hasDateRange) {
      assignmentQuery.andWhere(
        "assignment.assignmentDate BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    // Get all completed assignments
    const assignments = await assignmentQuery
      .orderBy("assignment.assignmentDate", "ASC")
      .getMany();

    // @ts-ignore
    const totalLuWangCapacity = parseFloat(pitak.totalLuwang);

    if (assignments.length === 0) {
      return {
        status: true,
        message: "No LuWang data found for the specified period",
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
          period: hasDateRange ? dateRange : null,
          luWangSummary: {
            totalCapacity: totalLuWangCapacity,
            totalAssigned: 0,
            utilizationRate: 0,
            averageDailyLuWang: 0,
            peakDailyLuWang: 0,
            daysWithAssignments: 0,
          },
          dailyBreakdown: [],
          workerPerformance: [],
          trends: {
            dailyTrend: [],
            weeklyTrend: [],
            monthlyTrend: [],
          },
          capacityAnalysis: {
            currentUtilization: 0,
            optimalUtilization: 0,
            capacityGap: 0,
            recommendations: [],
          },
        },
      };
    }

    // Calculate daily breakdown
    const dailyBreakdown = {};
    assignments.forEach((assignment) => {
      // @ts-ignore
      const date = assignment.assignmentDate.toISOString().split("T")[0];
      // @ts-ignore
      if (!dailyBreakdown[date]) {
        // @ts-ignore
        dailyBreakdown[date] = {
          date,
          assignments: 0,
          totalLuWang: 0,
          workers: new Set(),
          workerDetails: [],
        };
      }
      // @ts-ignore
      dailyBreakdown[date].assignments++;
      // @ts-ignore
      dailyBreakdown[date].totalLuWang += parseFloat(assignment.luwangCount);
      // @ts-ignore
      if (assignment.worker) {
        // @ts-ignore
        dailyBreakdown[date].workers.add(assignment.worker.id);
        // @ts-ignore
        dailyBreakdown[date].workerDetails.push({
          // @ts-ignore
          workerId: assignment.worker.id,
          // @ts-ignore
          workerName: assignment.worker.name,
          // @ts-ignore
          luwangCount: parseFloat(assignment.luwangCount),
        });
      }
    });

    const dailyBreakdownArray = Object.values(dailyBreakdown)
      .map((day) => ({
        date: day.date,
        assignments: day.assignments,
        totalLuWang: day.totalLuWang,
        uniqueWorkers: day.workers.size,
        averageLuWangPerAssignment:
          day.assignments > 0 ? day.totalLuWang / day.assignments : 0,
        workerDetails: day.workerDetails,
      }))
      // @ts-ignore
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate worker performance
    const workerPerformance = {};
    assignments.forEach((assignment) => {
      // @ts-ignore
      if (!assignment.worker) return;

      // @ts-ignore
      const workerId = assignment.worker.id;
      // @ts-ignore
      if (!workerPerformance[workerId]) {
        // @ts-ignore
        workerPerformance[workerId] = {
          workerId,
          // @ts-ignore
          workerName: assignment.worker.name,
          totalLuWang: 0,
          assignments: 0,
          firstAssignment: assignment.assignmentDate,
          lastAssignment: assignment.assignmentDate,
        };
      }

      // @ts-ignore
      workerPerformance[workerId].totalLuWang += parseFloat(
        // @ts-ignore
        assignment.luwangCount,
      );
      // @ts-ignore
      workerPerformance[workerId].assignments++;

      // @ts-ignore
      if (
        // @ts-ignore
        assignment.assignmentDate < workerPerformance[workerId].firstAssignment
      ) {
        // @ts-ignore
        workerPerformance[workerId].firstAssignment = assignment.assignmentDate;
      }
      // @ts-ignore
      if (
        // @ts-ignore
        assignment.assignmentDate > workerPerformance[workerId].lastAssignment
      ) {
        // @ts-ignore
        workerPerformance[workerId].lastAssignment = assignment.assignmentDate;
      }
    });

    // Calculate worker averages and sort
    const workerPerformanceArray = Object.values(workerPerformance)
      .map((worker) => ({
        ...worker,
        averageLuWang:
          worker.assignments > 0 ? worker.totalLuWang / worker.assignments : 0,
        assignmentFrequency: calculateAssignmentFrequency(
          worker.firstAssignment,
          worker.lastAssignment,
          worker.assignments,
        ),
      }))
      .sort((a, b) => b.totalLuWang - a.totalLuWang);

    // Calculate LuWang summary
    // @ts-ignore
    const totalLuWangAssigned = assignments.reduce(
      // @ts-ignore
      (sum, a) => sum + parseFloat(a.luwangCount),
      0,
    );
    const daysWithAssignments = Object.keys(dailyBreakdown).length;
    const totalDays = hasDateRange
      ? // @ts-ignore
        Math.ceil(
          // @ts-ignore
          (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
        ) + 1
      : 30; // Default to 30 days if no date range

    const utilizationRate =
      totalLuWangCapacity > 0
        ? (totalLuWangAssigned / (totalLuWangCapacity * totalDays)) * 100
        : 0;

    const averageDailyLuWang =
      daysWithAssignments > 0 ? totalLuWangAssigned / daysWithAssignments : 0;
    const peakDailyLuWang = Math.max(
      ...dailyBreakdownArray.map((day) => day.totalLuWang),
    );

    // Calculate trends
    const trends = {
      dailyTrend: calculateDailyTrend(dailyBreakdownArray),
      weeklyTrend: calculateWeeklyTrend(dailyBreakdownArray),
      monthlyTrend: calculateMonthlyTrend(dailyBreakdownArray),
    };

    // Calculate capacity analysis
    const capacityAnalysis = {
      currentUtilization: utilizationRate,
      optimalUtilization: 85, // Industry standard optimal utilization
      capacityGap: 85 - utilizationRate,
      recommendations: generateCapacityRecommendations(
        utilizationRate,
        totalLuWangCapacity,
        totalLuWangAssigned,
      ),
    };

    return {
      status: true,
      message: "LuWang report retrieved successfully",
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
              startDate:
                dailyBreakdownArray[0]?.date ||
                new Date().toISOString().split("T")[0],
              endDate:
                dailyBreakdownArray[dailyBreakdownArray.length - 1]?.date ||
                new Date().toISOString().split("T")[0],
              days: totalDays,
            },
        luWangSummary: {
          totalCapacity: totalLuWangCapacity,
          totalAssigned: totalLuWangAssigned,
          utilizationRate,
          averageDailyLuWang,
          peakDailyLuWang,
          daysWithAssignments,
          totalDays,
          assignmentDaysRatio: (daysWithAssignments / totalDays) * 100,
        },
        dailyBreakdown: dailyBreakdownArray,
        workerPerformance: workerPerformanceArray,
        trends,
        capacityAnalysis,
        efficiencyMetrics: {
          averageLuWangPerAssignment:
            assignments.length > 0
              ? totalLuWangAssigned / assignments.length
              : 0,
          averageAssignmentsPerDay:
            daysWithAssignments > 0
              ? assignments.length / daysWithAssignments
              : 0,
          averageWorkersPerDay:
            daysWithAssignments > 0
              ? dailyBreakdownArray.reduce(
                  (sum, day) => sum + day.uniqueWorkers,
                  0,
                ) / daysWithAssignments
              : 0,
          workerUtilizationRate:
            workerPerformanceArray.length > 0
              ? workerPerformanceArray.reduce(
                  (sum, worker) => sum + worker.averageLuWang,
                  0,
                ) / workerPerformanceArray.length
              : 0,
        },
        peakPerformance: {
          peakDay: dailyBreakdownArray.reduce(
            (max, day) => (day.totalLuWang > max.totalLuWang ? day : max),
            dailyBreakdownArray[0],
          ),
          peakWorker: workerPerformanceArray[0],
          bestDayOfWeek: calculateBestDayOfWeek(dailyBreakdownArray),
        },
      },
    };
  } catch (error) {
    console.error("Error retrieving LuWang report:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve LuWang report: ${error.message}`,
      data: null,
    };
  }
};

// Helper functions
/**
 * @param {string | number | Date} firstDate
 * @param {string | number | Date} lastDate
 * @param {number} assignments
 */
function calculateAssignmentFrequency(firstDate, lastDate, assignments) {
  // @ts-ignore
  const timeSpan =
    // @ts-ignore
    (new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24);
  return timeSpan > 0 ? assignments / timeSpan : 0;
}

/**
 * @param {any[]} dailyBreakdown
 */
function calculateDailyTrend(dailyBreakdown) {
  if (dailyBreakdown.length < 2) return [];

  return dailyBreakdown.map(
    (
      /** @type {{ totalLuWang: number; date: any; }} */ day,
      /** @type {number} */ index,
    ) => {
      const prevDay = dailyBreakdown[index - 1];
      const growth = prevDay
        ? ((day.totalLuWang - prevDay.totalLuWang) / prevDay.totalLuWang) * 100
        : 0;

      return {
        date: day.date,
        value: day.totalLuWang,
        growth,
        trend: growth > 10 ? "up" : growth < -10 ? "down" : "stable",
      };
    },
  );
}

/**
 * @param {string | any[]} dailyBreakdown
 */
function calculateWeeklyTrend(dailyBreakdown) {
  if (dailyBreakdown.length < 7) return [];

  const weeklyData = [];
  for (let i = 6; i < dailyBreakdown.length; i += 7) {
    const week = dailyBreakdown.slice(i - 6, i + 1);
    // @ts-ignore
    const weekTotal = week.reduce(
      (/** @type {any} */ sum, /** @type {{ totalLuWang: any; }} */ day) =>
        sum + day.totalLuWang,
      0,
    );
    const weekAvg = weekTotal / week.length;

    weeklyData.push({
      weekStart: week[0].date,
      weekEnd: week[week.length - 1].date,
      totalLuWang: weekTotal,
      averageDailyLuWang: weekAvg,
      // @ts-ignore
      assignments: week.reduce(
        (/** @type {any} */ sum, /** @type {{ assignments: any; }} */ day) =>
          sum + day.assignments,
        0,
      ),
    });
  }

  return weeklyData;
}

/**
 * @param {any[]} dailyBreakdown
 */
function calculateMonthlyTrend(dailyBreakdown) {
  if (dailyBreakdown.length < 30) return [];

  const monthlyData = {};
  dailyBreakdown.forEach(
    (
      /** @type {{ date: string; totalLuWang: any; assignments: any; }} */ day,
    ) => {
      const month = day.date.substring(0, 7); // YYYY-MM
      // @ts-ignore
      if (!monthlyData[month]) {
        // @ts-ignore
        monthlyData[month] = {
          month,
          totalLuWang: 0,
          assignments: 0,
          days: 0,
        };
      }
      // @ts-ignore
      monthlyData[month].totalLuWang += day.totalLuWang;
      // @ts-ignore
      monthlyData[month].assignments += day.assignments;
      // @ts-ignore
      monthlyData[month].days++;
    },
  );

  return Object.values(monthlyData)
    .map((month) => ({
      ...month,
      averageDailyLuWang: month.days > 0 ? month.totalLuWang / month.days : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * @param {number} utilizationRate
 * @param {number} totalCapacity
 * @param {number} totalAssigned
 */
function generateCapacityRecommendations(
  utilizationRate,
  totalCapacity,
  totalAssigned,
) {
  const recommendations = [];

  if (utilizationRate < 50) {
    recommendations.push({
      type: "underutilized",
      priority: "medium",
      message: `Pitak is underutilized (${utilizationRate.toFixed(1)}% utilization).`,
      actions: [
        "Increase marketing for this pitak",
        "Consider offering promotions",
        "Evaluate if pitak capacity is too high",
      ],
    });
  } else if (utilizationRate > 90) {
    recommendations.push({
      type: "overutilized",
      priority: "high",
      message: `Pitak is nearing full capacity (${utilizationRate.toFixed(1)}% utilization).`,
      actions: [
        "Consider increasing pitak capacity",
        "Implement assignment limits",
        "Prioritize high-value assignments",
      ],
    });
  } else {
    recommendations.push({
      type: "optimal",
      priority: "low",
      message: `Pitak utilization is at optimal levels (${utilizationRate.toFixed(1)}%).`,
      actions: [
        "Maintain current assignment levels",
        "Continue monitoring utilization",
      ],
    });
  }

  // Check if capacity matches demand
  const dailyAverage = totalAssigned / 30; // Assuming 30-day period
  const optimalCapacity = dailyAverage * 1.2; // 20% buffer

  if (totalCapacity < optimalCapacity * 0.8) {
    recommendations.push({
      type: "capacity_shortage",
      priority: "high",
      message: `Pitak capacity may be insufficient for current demand.`,
      actions: [
        `Consider increasing capacity from ${totalCapacity.toFixed(2)} to ${optimalCapacity.toFixed(2)} LuWang`,
        "Review assignment scheduling",
      ],
    });
  } else if (totalCapacity > optimalCapacity * 1.5) {
    recommendations.push({
      type: "excess_capacity",
      priority: "medium",
      message: `Pitak may have excess capacity.`,
      actions: [
        `Consider reducing capacity from ${totalCapacity.toFixed(2)} to ${optimalCapacity.toFixed(2)} LuWang`,
        "Focus on increasing utilization",
      ],
    });
  }

  return recommendations;
}

/**
 * @param {any[]} dailyBreakdown
 */
function calculateBestDayOfWeek(dailyBreakdown) {
  if (dailyBreakdown.length === 0) return null;

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayTotals = Array(7).fill(0);
  const dayCounts = Array(7).fill(0);

  dailyBreakdown.forEach(
    (
      /** @type {{ date: string | number | Date; totalLuWang: any; }} */ day,
    ) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      dayTotals[dayOfWeek] += day.totalLuWang;
      dayCounts[dayOfWeek]++;
    },
  );

  // Calculate averages
  const dayAverages = dayTotals.map((total, index) =>
    dayCounts[index] > 0 ? total / dayCounts[index] : 0,
  );

  const bestDayIndex = dayAverages.reduce(
    (maxIndex, avg, index) => (avg > dayAverages[maxIndex] ? index : maxIndex),
    0,
  );

  return {
    day: daysOfWeek[bestDayIndex],
    averageLuWang: dayAverages[bestDayIndex],
    totalLuWang: dayTotals[bestDayIndex],
    daysCounted: dayCounts[bestDayIndex],
  };
}
