// dashboard/handlers/assignmentAnalytics.js
//@ts-check
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

class AssignmentAnalytics {
  /**
   * @param {{ assignment: any; worker: any; pitak: any; }} repositories
   * @param {any} params
   */
  // @ts-ignore
  async getAssignmentOverview(repositories, params) {
    const {
      assignment: assignmentRepo,
      worker: workerRepo,
      pitak: pitakRepo,
    } = repositories;
    const { currentSession = false } = params;

    try {
      // Get current date for calculations
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Get assignment counts by status
      const statusCountsQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          "assignment.status",
          "COUNT(assignment.id) as count",
          "SUM(assignment.luwangCount) as totalLuwang",
        ])
        .groupBy("assignment.status");

      if (currentSession) {
        statusCountsQuery.where("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const statusCounts = await statusCountsQuery.getRawMany();

      // Get this week's assignments
      const thisWeekQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .where("assignment.assignmentDate >= :startOfWeek", { startOfWeek });

      if (currentSession) {
        thisWeekQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const thisWeekAssignments = await thisWeekQuery.getCount();

      // Get this month's assignments
      const thisMonthQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .where("assignment.assignmentDate >= :startOfMonth", { startOfMonth });

      if (currentSession) {
        thisMonthQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const thisMonthAssignments = await thisMonthQuery.getCount();

      // Get assignments for today
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );

      const todayQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .where("assignment.assignmentDate >= :todayStart", { todayStart })
        .andWhere("assignment.assignmentDate < :todayEnd", { todayEnd });

      if (currentSession) {
        todayQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const todayAssignments = await todayQuery.getCount();

      // Get active workers count (workers with active assignments)
      const activeWorkersQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .leftJoin("assignment.worker", "worker")
        .select("COUNT(DISTINCT assignment.workerId)", "count")
        .where("assignment.status = :status", { status: "active" });

      if (currentSession) {
        activeWorkersQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const activeWorkers = await activeWorkersQuery.getRawOne();

      // Get total workers
      const totalWorkers = await workerRepo.count({
        where: { status: "active" },
      });

      // Get pitak utilization
      const activePitaksQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .leftJoin("assignment.pitak", "pitak")
        .select("COUNT(DISTINCT assignment.pitakId)", "count")
        .where("assignment.status = :status", { status: "active" });

      if (currentSession) {
        activePitaksQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const activePitaks = await activePitaksQuery.getRawOne();

      const totalPitaksQuery = pitakRepo
        .createQueryBuilder("pitak")
        .where("pitak.status = :status", { status: "active" });

      if (currentSession) {
        totalPitaksQuery.andWhere("pitak.bukid.session.id = :sessionId", {
          sessionId,
        });
      }

      const totalPitaks = await totalPitaksQuery.getCount();

      // Get luwang summary
      const luwangSummaryQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          "SUM(assignment.luwangCount) as totalLuwang",
          "AVG(assignment.luwangCount) as avgLuwang",
          "MAX(assignment.luwangCount) as maxLuwang",
          "MIN(assignment.luwangCount) as minLuwang",
        ]);

      if (currentSession) {
        luwangSummaryQuery.where("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const luwangSummary = await luwangSummaryQuery.getRawOne();

      // Calculate worker utilization
      const workerUtilization =
        totalWorkers > 0
          ? (parseInt(activeWorkers?.count) / totalWorkers) * 100
          : 0;

      // Calculate pitak utilization
      const pitakUtilization =
        totalPitaks > 0
          ? (parseInt(activePitaks?.count) / totalPitaks) * 100
          : 0;

      // Format status counts
      const statusSummary = statusCounts.reduce(
        (
          /** @type {{ [x: string]: { count: number; totalLuwang: number; }; }} */ acc,
          /** @type {{ assignment_status: string | number; count: string; totalLuwang: string; }} */ item,
        ) => {
          acc[item.assignment_status] = {
            count: parseInt(item.count),
            totalLuwang: parseFloat(item.totalLuwang) || 0,
          };
          return acc;
        },
        {},
      );

      // Calculate completion rate
      const totalAssignments = Object.values(statusSummary).reduce(
        (sum, item) => sum + item.count,
        0,
      );
      const completedCount = statusSummary.completed?.count || 0;
      const completionRate =
        totalAssignments > 0 ? (completedCount / totalAssignments) * 100 : 0;

      return {
        status: true,
        message: "Assignment overview retrieved",
        data: {
          summary: {
            totalAssignments: totalAssignments,
            activeAssignments: statusSummary.active?.count || 0,
            completedAssignments: completedCount,
            cancelledAssignments: statusSummary.cancelled?.count || 0,
            completionRate: completionRate,
          },
          periodMetrics: {
            today: todayAssignments,
            thisWeek: thisWeekAssignments,
            thisMonth: thisMonthAssignments,
            dailyAverage:
              thisMonthAssignments > 0
                ? thisMonthAssignments / today.getDate()
                : 0,
          },
          luwangMetrics: {
            total: parseFloat(luwangSummary?.totalLuwang) || 0,
            average: parseFloat(luwangSummary?.avgLuwang) || 0,
            maximum: parseFloat(luwangSummary?.maxLuwang) || 0,
            minimum: parseFloat(luwangSummary?.minLuwang) || 0,
            averagePerWorker:
              totalWorkers > 0
                ? parseFloat(luwangSummary?.totalLuwang) / totalWorkers || 0
                : 0,
          },
          utilization: {
            workers: {
              active: parseInt(activeWorkers?.count) || 0,
              total: totalWorkers,
              utilizationRate: workerUtilization,
            },
            pitaks: {
              active: parseInt(activePitaks?.count) || 0,
              total: totalPitaks,
              utilizationRate: pitakUtilization,
            },
          },
          statusBreakdown: statusSummary,
          lastUpdated: new Date(),
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      console.error("getAssignmentOverview error:", error);
      throw error;
    }
  }

  /**
   * @param {{ assignment: any; }} repositories
   * @param {{ period?: "month" | undefined; groupBy?: "daily" | undefined; currentSession?: boolean; }} params
   */
  async getAssignmentTrend(repositories, params) {
    const { assignment: assignmentRepo } = repositories;
    const {
      period = "month",
      groupBy = "daily",
      currentSession = false,
    } = params;

    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      let groupByClause;

      switch (period) {
        // @ts-ignore
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          groupByClause =
            groupBy === "daily"
              ? "DATE(assignment.assignmentDate)"
              : 'STRFTIME("%Y-%m-%d %H:00:00", assignment.assignmentDate)';
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          groupByClause = "DATE(assignment.assignmentDate)";
          break;
        // @ts-ignore
        case "quarter":
          startDate.setMonth(startDate.getMonth() - 3);
          groupByClause = 'STRFTIME("%Y-%m-%W", assignment.assignmentDate)'; // Weekly
          break;
        // @ts-ignore
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          groupByClause = 'STRFTIME("%Y-%m", assignment.assignmentDate)'; // Monthly
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
          groupByClause = "DATE(assignment.assignmentDate)";
      }

      // Get assignment trend data
      const trendQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          `${groupByClause} as period`,
          "COUNT(assignment.id) as assignmentCount",
          "SUM(CASE WHEN assignment.status = 'completed' THEN 1 ELSE 0 END) as completedCount",
          "SUM(CASE WHEN assignment.status = 'active' THEN 1 ELSE 0 END) as activeCount",
          "SUM(assignment.luwangCount) as totalLuwang",
          "COUNT(DISTINCT assignment.workerId) as uniqueWorkers",
          "COUNT(DISTINCT assignment.pitakId) as uniquePitaks",
        ])
        .where("assignment.assignmentDate BETWEEN :start AND :end", {
          start: startDate,
          end: endDate,
        });

      if (currentSession) {
        const sessionId = await farmSessionDefaultSessionId();
        trendQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const trendData = await trendQuery
        .groupBy(groupByClause)
        .orderBy("period", "ASC")
        .getRawMany();

      // Calculate completion rates
      const trendWithRates = trendData.map(
        (
          /** @type {{ assignmentCount: string; completedCount: string; period: any; activeCount: string; totalLuwang: string; uniqueWorkers: string; uniquePitaks: string; }} */ item,
        ) => {
          const assignmentCount = parseInt(item.assignmentCount) || 0;
          const completedCount = parseInt(item.completedCount) || 0;
          const completionRate =
            assignmentCount > 0 ? (completedCount / assignmentCount) * 100 : 0;

          return {
            period: item.period,
            assignmentCount: assignmentCount,
            completedCount: completedCount,
            activeCount: parseInt(item.activeCount) || 0,
            totalLuwang: parseFloat(item.totalLuwang) || 0,
            uniqueWorkers: parseInt(item.uniqueWorkers) || 0,
            uniquePitaks: parseInt(item.uniquePitaks) || 0,
            completionRate: completionRate,
            averageLuwang:
              assignmentCount > 0
                ? parseFloat(item.totalLuwang) / assignmentCount
                : 0,
          };
        },
      );

      // Calculate summary metrics
      const summary = trendWithRates.reduce(
        (
          /** @type {{ totalAssignments: any; totalCompleted: any; totalLuwang: any; totalUniqueWorkers: Set<any>; totalUniquePitaks: Set<any>; }} */ acc,
          /** @type {{ assignmentCount: any; completedCount: any; totalLuwang: any; uniqueWorkers: any; uniquePitaks: any; }} */ period,
        ) => {
          acc.totalAssignments += period.assignmentCount;
          acc.totalCompleted += period.completedCount;
          acc.totalLuwang += period.totalLuwang;
          acc.totalUniqueWorkers = new Set([
            ...acc.totalUniqueWorkers,
            period.uniqueWorkers,
          ]);
          acc.totalUniquePitaks = new Set([
            ...acc.totalUniquePitaks,
            period.uniquePitaks,
          ]);
          return acc;
        },
        {
          totalAssignments: 0,
          totalCompleted: 0,
          totalLuwang: 0,
          totalUniqueWorkers: new Set(),
          totalUniquePitaks: new Set(),
        },
      );

      const overallCompletionRate =
        summary.totalAssignments > 0
          ? (summary.totalCompleted / summary.totalAssignments) * 100
          : 0;

      // Get growth metrics
      let growthRate = 0;
      if (trendWithRates.length >= 2) {
        const currentPeriod =
          trendWithRates[trendWithRates.length - 1].assignmentCount;
        const previousPeriod =
          trendWithRates[trendWithRates.length - 2].assignmentCount;

        if (previousPeriod > 0) {
          growthRate =
            ((currentPeriod - previousPeriod) / previousPeriod) * 100;
        }
      }

      // Get peak assignment days
      const peakDays = [...trendWithRates]
        .sort((a, b) => b.assignmentCount - a.assignmentCount)
        .slice(0, 5)
        .map((day) => ({
          period: day.period,
          assignmentCount: day.assignmentCount,
          completionRate: day.completionRate,
          totalLuwang: day.totalLuwang,
        }));

      // Get average daily metrics
      const averageDailyAssignments =
        trendWithRates.length > 0
          ? summary.totalAssignments / trendWithRates.length
          : 0;

      const averageDailyLuwang =
        trendWithRates.length > 0
          ? summary.totalLuwang / trendWithRates.length
          : 0;

      return {
        status: true,
        message: "Assignment trend data retrieved",
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period,
            groupBy: groupBy,
          },
          trend: trendWithRates,
          summary: {
            totalAssignments: summary.totalAssignments,
            totalCompleted: summary.totalCompleted,
            totalLuwang: summary.totalLuwang,
            totalUniqueWorkers: summary.totalUniqueWorkers.size,
            totalUniquePitaks: summary.totalUniquePitaks.size,
            overallCompletionRate: overallCompletionRate,
            averageDailyAssignments: averageDailyAssignments,
            averageDailyLuwang: averageDailyLuwang,
            averageLuwangPerAssignment:
              summary.totalAssignments > 0
                ? summary.totalLuwang / summary.totalAssignments
                : 0,
          },
          growthMetrics: {
            assignmentGrowthRate: growthRate,
            averageCompletionRate:
              trendWithRates.length > 0
                ? trendWithRates.reduce(
                    (
                      /** @type {any} */ sum,
                      /** @type {{ completionRate: any; }} */ period,
                    ) => sum + period.completionRate,
                    0,
                  ) / trendWithRates.length
                : 0,
            workerUtilization:
              trendWithRates.length > 0
                ? trendWithRates.reduce(
                    (
                      /** @type {any} */ sum,
                      /** @type {{ uniqueWorkers: any; }} */ period,
                    ) => sum + period.uniqueWorkers,
                    0,
                  ) / trendWithRates.length
                : 0,
          },
          peakPeriods: peakDays,
          recommendations:
            overallCompletionRate < 70
              ? [
                  "Focus on completing active assignments",
                  "Review assignment distribution",
                  "Consider adjusting luwang targets",
                ]
              : [
                  "Maintain current assignment completion rate",
                  "Optimize worker assignment distribution",
                  "Monitor assignment trends regularly",
                ],
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      console.error("getAssignmentTrend error:", error);
      throw error;
    }
  }

  /**
   * @param {{ assignment: any; worker: any; }} repositories
   * @param {{ period?: "month" | undefined; workerId: any; pitakId: any; currentSession?: boolean; }} params
   */
  async getLuwangSummary(repositories, params) {
    // @ts-ignore
    // @ts-ignore
    const { assignment: assignmentRepo, worker: workerRepo } = repositories;
    const {
      period = "month",
      workerId,
      pitakId,
      currentSession = false,
    } = params;

    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();

      switch (period) {
        // @ts-ignore
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        // @ts-ignore
        case "quarter":
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        // @ts-ignore
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Build query
      let query = assignmentRepo
        .createQueryBuilder("assignment")
        .leftJoin("assignment.worker", "worker")
        .leftJoin("assignment.pitak", "pitak")
        .leftJoin("pitak.bukid", "bukid")
        .select([
          "assignment.id",
          "assignment.luwangCount",
          "assignment.assignmentDate",
          "assignment.status",
          "worker.name as workerName",
          "worker.id as workerId",
          "pitak.id as pitakId",
          "pitak.location as pitakLocation",
          "bukid.name as bukidName",
        ]);

      // Apply filters
      const whereConditions = [
        "assignment.assignmentDate BETWEEN :start AND :end",
      ];
      const parameters = { start: startDate, end: endDate };

      if (currentSession) {
        whereConditions.push("assignment.session.id = :sessionId");
        // @ts-ignore
        parameters.sessionId = sessionId;
      }

      if (workerId) {
        whereConditions.push("assignment.workerId = :workerId");
        // @ts-ignore
        parameters.workerId = workerId;
      }

      if (pitakId) {
        whereConditions.push("assignment.pitakId = :pitakId");
        // @ts-ignore
        parameters.pitakId = pitakId;
      }

      query.where(whereConditions.join(" AND "), parameters);
      query.orderBy("assignment.assignmentDate", "DESC");

      const assignments = await query.getRawMany();

      // Calculate luwang summary
      const totalLuwang = assignments.reduce(
        (
          /** @type {number} */ sum,
          /** @type {{ assignment_luwangCount: string; }} */ assignment,
        ) => sum + parseFloat(assignment.assignment_luwangCount),
        0,
      );

      const completedLuwang = assignments
        .filter(
          (/** @type {{ assignment_status: string; }} */ a) =>
            a.assignment_status === "completed",
        )
        .reduce(
          (
            /** @type {number} */ sum,
            /** @type {{ assignment_luwangCount: string; }} */ assignment,
          ) => sum + parseFloat(assignment.assignment_luwangCount),
          0,
        );

      const activeLuwang = assignments
        .filter(
          (/** @type {{ assignment_status: string; }} */ a) =>
            a.assignment_status === "active",
        )
        .reduce(
          (
            /** @type {number} */ sum,
            /** @type {{ assignment_luwangCount: string; }} */ assignment,
          ) => sum + parseFloat(assignment.assignment_luwangCount),
          0,
        );

      // Group by worker
      const luwangByWorker = assignments.reduce(
        (
          /** @type {{ [x: string]: { assignmentCount: number; }; }} */ acc,
          /** @type {{ workerId: any; workerName: any; assignment_luwangCount: string; assignment_status: string; }} */ assignment,
        ) => {
          const workerId = assignment.workerId;
          if (!acc[workerId]) {
            acc[workerId] = {
              // @ts-ignore
              workerName: assignment.workerName,
              totalLuwang: 0,
              completedLuwang: 0,
              activeLuwang: 0,
              assignmentCount: 0,
            };
          }

          // @ts-ignore
          acc[workerId].totalLuwang += parseFloat(
            assignment.assignment_luwangCount,
          );

          if (assignment.assignment_status === "completed") {
            // @ts-ignore
            acc[workerId].completedLuwang += parseFloat(
              assignment.assignment_luwangCount,
            );
          } else if (assignment.assignment_status === "active") {
            // @ts-ignore
            acc[workerId].activeLuwang += parseFloat(
              assignment.assignment_luwangCount,
            );
          }

          acc[workerId].assignmentCount++;

          return acc;
        },
        {},
      );

      // Group by pitak
      const luwangByPitak = assignments.reduce(
        (
          /** @type {{ [x: string]: { assignmentCount: number; }; }} */ acc,
          /** @type {{ pitakId: any; pitakLocation: any; bukidName: any; assignment_luwangCount: string; }} */ assignment,
        ) => {
          const pitakId = assignment.pitakId;
          if (!acc[pitakId]) {
            acc[pitakId] = {
              // @ts-ignore
              pitakLocation: assignment.pitakLocation,
              bukidName: assignment.bukidName,
              totalLuwang: 0,
              assignmentCount: 0,
            };
          }

          // @ts-ignore
          acc[pitakId].totalLuwang += parseFloat(
            assignment.assignment_luwangCount,
          );
          acc[pitakId].assignmentCount++;

          return acc;
        },
        {},
      );

      // Calculate daily luwang
      const dailyLuwang = assignments.reduce(
        (
          /** @type {{ [x: string]: { assignments: number; }; }} */ acc,
          /** @type {{ assignment_assignmentDate: { toISOString: () => string; }; assignment_luwangCount: string; }} */ assignment,
        ) => {
          const date = assignment.assignment_assignmentDate
            .toISOString()
            .split("T")[0];
          if (!acc[date]) {
            // @ts-ignore
            acc[date] = { luwang: 0, assignments: 0 };
          }
          // @ts-ignore
          acc[date].luwang += parseFloat(assignment.assignment_luwangCount);
          acc[date].assignments++;
          return acc;
        },
        {},
      );

      const dailyTrend = Object.keys(dailyLuwang)
        .map((date) => ({
          date: date,
          luwang: dailyLuwang[date].luwang,
          assignments: dailyLuwang[date].assignments,
          averageLuwang:
            dailyLuwang[date].assignments > 0
              ? dailyLuwang[date].luwang / dailyLuwang[date].assignments
              : 0,
          // @ts-ignore
        }))
        // @ts-ignore
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Get top performers by luwang
      const topPerformers = Object.values(luwangByWorker)
        .sort((a, b) => b.totalLuwang - a.totalLuwang)
        .slice(0, 10)
        .map((worker) => ({
          ...worker,
          averageLuwangPerAssignment:
            worker.assignmentCount > 0
              ? worker.totalLuwang / worker.assignmentCount
              : 0,
          completionRate:
            worker.totalLuwang > 0
              ? (worker.completedLuwang / worker.totalLuwang) * 100
              : 0,
        }));

      // Get most productive pitaks
      const topPitaks = Object.values(luwangByPitak)
        .sort((a, b) => b.totalLuwang - a.totalLuwang)
        .slice(0, 10)
        .map((pitak) => ({
          ...pitak,
          averageLuwangPerAssignment:
            pitak.assignmentCount > 0
              ? pitak.totalLuwang / pitak.assignmentCount
              : 0,
        }));

      // Calculate statistics
      const averageLuwangPerAssignment =
        assignments.length > 0 ? totalLuwang / assignments.length : 0;

      const averageDailyLuwang =
        dailyTrend.length > 0
          ? dailyTrend.reduce((sum, day) => sum + day.luwang, 0) /
            dailyTrend.length
          : 0;

      return {
        status: true,
        message: "Luwang summary retrieved",
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period,
          },
          summary: {
            totalLuwang: totalLuwang,
            completedLuwang: completedLuwang,
            activeLuwang: activeLuwang,
            assignmentCount: assignments.length,
            averageLuwangPerAssignment: averageLuwangPerAssignment,
            completionRate:
              totalLuwang > 0 ? (completedLuwang / totalLuwang) * 100 : 0,
          },
          dailyTrend: dailyTrend,
          averages: {
            daily: averageDailyLuwang,
            weekly: averageDailyLuwang * 7,
            monthly: averageDailyLuwang * 30,
          },
          byWorker: Object.values(luwangByWorker).map((worker) => ({
            workerName: worker.workerName,
            totalLuwang: worker.totalLuwang,
            completedLuwang: worker.completedLuwang,
            activeLuwang: worker.activeLuwang,
            assignmentCount: worker.assignmentCount,
            averageLuwang:
              worker.assignmentCount > 0
                ? worker.totalLuwang / worker.assignmentCount
                : 0,
            completionRate:
              worker.totalLuwang > 0
                ? (worker.completedLuwang / worker.totalLuwang) * 100
                : 0,
          })),
          byPitak: Object.values(luwangByPitak).map((pitak) => ({
            pitakLocation: pitak.pitakLocation,
            bukidName: pitak.bukidName,
            totalLuwang: pitak.totalLuwang,
            assignmentCount: pitak.assignmentCount,
            averageLuwang:
              pitak.assignmentCount > 0
                ? pitak.totalLuwang / pitak.assignmentCount
                : 0,
          })),
          topPerformers: topPerformers,
          topPitaks: topPitaks,
          filters: {
            workerId: workerId,
            pitakId: pitakId,
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      console.error("getLuwangSummary error:", error);
      throw error;
    }
  }

  /**
   * @param {{ assignment: any; worker: any; }} repositories
   * @param {{ period?: "month" | undefined; minAssignments?: 5 | undefined; currentSession?: boolean; }} params
   */
  async getAssignmentCompletionRate(repositories, params) {
    // @ts-ignore
    // @ts-ignore
    const { assignment: assignmentRepo, worker: workerRepo } = repositories;
    const {
      period = "month",
      minAssignments = 5,
      currentSession = false,
    } = params;

    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();

      switch (period) {
        // @ts-ignore
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        // @ts-ignore
        case "quarter":
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        // @ts-ignore
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Get assignments with completion data
      const assignmentsQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .leftJoin("assignment.worker", "worker")
        .select([
          "worker.id as workerId",
          "worker.name as workerName",
          "COUNT(assignment.id) as totalAssignments",
          "SUM(CASE WHEN assignment.status = 'completed' THEN 1 ELSE 0 END) as completedAssignments",
          "SUM(CASE WHEN assignment.status = 'active' THEN 1 ELSE 0 END) as activeAssignments",
          "SUM(CASE WHEN assignment.status = 'cancelled' THEN 1 ELSE 0 END) as cancelledAssignments",
          "AVG(assignment.luwangCount) as averageLuwang",
        ])
        .where("assignment.assignmentDate BETWEEN :start AND :end", {
          start: startDate,
          end: endDate,
        })
        .groupBy("worker.id")
        .addGroupBy("worker.name")
        .having("COUNT(assignment.id) >= :minAssignments", { minAssignments })
        .orderBy("completedAssignments", "DESC");

      if (currentSession) {
        assignmentsQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const assignments = await assignmentsQuery.getRawMany();

      // Calculate completion rates
      const completionData = assignments.map(
        (
          /** @type {{ totalAssignments: string; completedAssignments: string; workerId: any; workerName: any; activeAssignments: string; cancelledAssignments: string; averageLuwang: string; }} */ item,
        ) => {
          const total = parseInt(item.totalAssignments) || 0;
          const completed = parseInt(item.completedAssignments) || 0;
          const completionRate = total > 0 ? (completed / total) * 100 : 0;

          return {
            workerId: item.workerId,
            workerName: item.workerName,
            totalAssignments: total,
            completedAssignments: completed,
            activeAssignments: parseInt(item.activeAssignments) || 0,
            cancelledAssignments: parseInt(item.cancelledAssignments) || 0,
            completionRate: completionRate,
            averageLuwang: parseFloat(item.averageLuwang) || 0,
          };
        },
      );

      // Calculate overall statistics
      const overallStats = completionData.reduce(
        (
          /** @type {{ totalWorkers: number; totalAssignments: any; totalCompleted: any; totalActive: any; totalCancelled: any; sumCompletionRates: any; }} */ acc,
          /** @type {{ totalAssignments: any; completedAssignments: any; activeAssignments: any; cancelledAssignments: any; completionRate: any; }} */ worker,
        ) => {
          acc.totalWorkers++;
          acc.totalAssignments += worker.totalAssignments;
          acc.totalCompleted += worker.completedAssignments;
          acc.totalActive += worker.activeAssignments;
          acc.totalCancelled += worker.cancelledAssignments;
          acc.sumCompletionRates += worker.completionRate;
          return acc;
        },
        {
          totalWorkers: 0,
          totalAssignments: 0,
          totalCompleted: 0,
          totalActive: 0,
          totalCancelled: 0,
          sumCompletionRates: 0,
        },
      );

      const overallCompletionRate =
        overallStats.totalAssignments > 0
          ? (overallStats.totalCompleted / overallStats.totalAssignments) * 100
          : 0;

      const averageCompletionRate =
        overallStats.totalWorkers > 0
          ? overallStats.sumCompletionRates / overallStats.totalWorkers
          : 0;

      // Categorize workers by completion rate
      const categories = {
        excellent: [], // 90-100%
        good: [], // 75-89%
        average: [], // 50-74%
        needsImprovement: [], // Below 50%
      };

      completionData.forEach(
        (/** @type {{ completionRate: number; }} */ worker) => {
          if (worker.completionRate >= 90) {
            // @ts-ignore
            categories.excellent.push(worker);
          } else if (worker.completionRate >= 75) {
            // @ts-ignore
            categories.good.push(worker);
          } else if (worker.completionRate >= 50) {
            // @ts-ignore
            categories.average.push(worker);
          } else {
            // @ts-ignore
            categories.needsImprovement.push(worker);
          }
        },
      );

      // Get trend of completion rate over time
      const dailyCompletionQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          "DATE(assignment.assignmentDate) as date",
          "COUNT(assignment.id) as totalAssignments",
          "SUM(CASE WHEN assignment.status = 'completed' THEN 1 ELSE 0 END) as completedAssignments",
        ])
        .where("assignment.assignmentDate BETWEEN :start AND :end", {
          start: startDate,
          end: endDate,
        })
        .groupBy("DATE(assignment.assignmentDate)")
        .orderBy("date", "ASC");

      if (currentSession) {
        dailyCompletionQuery.andWhere("assignment.session.id = :sessionId", {
          sessionId,
        });
      }

      const dailyCompletion = await dailyCompletionQuery.getRawMany();

      const dailyCompletionTrend = dailyCompletion.map(
        (
          /** @type {{ totalAssignments: string; completedAssignments: string; date: any; }} */ item,
        ) => {
          const total = parseInt(item.totalAssignments) || 0;
          const completed = parseInt(item.completedAssignments) || 0;
          return {
            date: item.date,
            totalAssignments: total,
            completedAssignments: completed,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
          };
        },
      );

      // Calculate correlation between luwang count and completion rate
      const correlationData = completionData
        .filter(
          (/** @type {{ totalAssignments: number; }} */ worker) =>
            worker.totalAssignments > 0,
        )
        .map(
          (
            /** @type {{ workerName: any; completionRate: any; averageLuwang: any; }} */ worker,
          ) => ({
            workerName: worker.workerName,
            completionRate: worker.completionRate,
            averageLuwang: worker.averageLuwang,
          }),
        );

      // Get workers needing improvement
      const needsImprovement = completionData
        .filter(
          (/** @type {{ completionRate: number; }} */ worker) =>
            worker.completionRate < 70,
        )
        .sort(
          (
            /** @type {{ completionRate: number; }} */ a,
            /** @type {{ completionRate: number; }} */ b,
          ) => a.completionRate - b.completionRate,
        )
        .slice(0, 10);

      return {
        status: true,
        message: "Assignment completion rate analysis retrieved",
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period,
          },
          overallMetrics: {
            totalWorkers: overallStats.totalWorkers,
            totalAssignments: overallStats.totalAssignments,
            totalCompleted: overallStats.totalCompleted,
            totalActive: overallStats.totalActive,
            totalCancelled: overallStats.totalCancelled,
            overallCompletionRate: overallCompletionRate,
            averageCompletionRate: averageCompletionRate,
            averageAssignmentsPerWorker:
              overallStats.totalWorkers > 0
                ? overallStats.totalAssignments / overallStats.totalWorkers
                : 0,
          },
          workerCompletion: completionData,
          categories: {
            excellent: {
              count: categories.excellent.length,
              workers: categories.excellent,
              percentage:
                overallStats.totalWorkers > 0
                  ? (categories.excellent.length / overallStats.totalWorkers) *
                    100
                  : 0,
            },
            good: {
              count: categories.good.length,
              workers: categories.good,
              percentage:
                overallStats.totalWorkers > 0
                  ? (categories.good.length / overallStats.totalWorkers) * 100
                  : 0,
            },
            average: {
              count: categories.average.length,
              workers: categories.average,
              percentage:
                overallStats.totalWorkers > 0
                  ? (categories.average.length / overallStats.totalWorkers) *
                    100
                  : 0,
            },
            needsImprovement: {
              count: categories.needsImprovement.length,
              workers: categories.needsImprovement,
              percentage:
                overallStats.totalWorkers > 0
                  ? (categories.needsImprovement.length /
                      overallStats.totalWorkers) *
                    100
                  : 0,
            },
          },
          dailyTrend: dailyCompletionTrend,
          correlationData: correlationData,
          needsImprovement: needsImprovement,
          recommendations:
            overallCompletionRate < 70
              ? [
                  "Provide additional training for workers with low completion rates",
                  "Review assignment difficulty and adjust as needed",
                  "Implement incentives for high completion rates",
                ]
              : [
                  "Maintain current assignment management practices",
                  "Continue monitoring completion rates",
                  "Recognize top performers",
                ],
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      console.error("getAssignmentCompletionRate error:", error);
      throw error;
    }
  }

  /**
   * @param {{ pitak: any; assignment: any; }} repositories
   * @param {{ status?: "active" | undefined; currentSession?: boolean; }} params
   */
  async getPitakUtilization(repositories, params) {
    const { pitak: pitakRepo, assignment: assignmentRepo } = repositories;
    const { status = "active", currentSession = false } = params;

    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Get all pitaks
      const pitaksQuery = pitakRepo
        .createQueryBuilder("pitak")
        .leftJoinAndSelect("pitak.bukid", "bukid");

      if (status) {
        pitaksQuery.where("pitak.status = :status", { status });
      }

      if (currentSession) {
        pitaksQuery.andWhere("bukid.session.id = :sessionId", { sessionId });
      }

      const pitaks = await pitaksQuery.getMany();

      // Get assignments for each pitak
      const pitakUtilization = await Promise.all(
        pitaks.map(
          async (
            /** @type {{ id: any; totalLuwang: string; location: any; bukid: { name: any; }; status: any; }} */ pitak,
          ) => {
            // Get assignments for this pitak
            const assignmentsQuery = assignmentRepo
              .createQueryBuilder("assignment")
              .leftJoinAndSelect("assignment.worker", "worker")
              .where("assignment.pitak = :pitakId", { pitakId: pitak.id });

            if (currentSession) {
              assignmentsQuery.andWhere("assignment.session.id = :sessionId", {
                sessionId,
              });
            }

            const assignments = await assignmentsQuery.getMany();

            // Calculate utilization metrics
            const totalAssignments = assignments.length;
            const activeAssignments = assignments.filter(
              (/** @type {{ status: string; }} */ a) => a.status === "active",
            ).length;
            const completedAssignments = assignments.filter(
              (/** @type {{ status: string; }} */ a) =>
                a.status === "completed",
            ).length;

            const totalLuwang = assignments.reduce(
              (
                /** @type {number} */ sum,
                /** @type {{ luwangCount: string; }} */ a,
              ) => sum + parseFloat(a.luwangCount),
              0,
            );
            const availableLuwang = parseFloat(pitak.totalLuwang) || 0;
            const utilizationRate =
              availableLuwang > 0 ? (totalLuwang / availableLuwang) * 100 : 0;

            // Get unique workers
            const uniqueWorkers = [
              ...new Set(
                assignments.map(
                  (/** @type {{ worker: { id: any; }; }} */ a) => a.worker?.id,
                ),
              ),
            ].filter((id) => id);

            // Get last assignment date
            const lastAssignment =
              assignments.length > 0
                ? new Date(
                    Math.max(
                      ...assignments.map(
                        (
                          /** @type {{ assignmentDate: any; createdAt: any; }} */ a,
                        ) => new Date(a.assignmentDate || a.createdAt),
                      ),
                    ),
                  )
                : null;

            return {
              pitakId: pitak.id,
              location: pitak.location,
              bukidName: pitak.bukid?.name || "N/A",
              totalLuwang: availableLuwang,
              status: pitak.status,
              utilization: {
                totalAssignments: totalAssignments,
                activeAssignments: activeAssignments,
                completedAssignments: completedAssignments,
                totalLuwangAssigned: totalLuwang,
                utilizationRate: utilizationRate,
                uniqueWorkers: uniqueWorkers.length,
                lastAssignment: lastAssignment,
                daysSinceLastAssignment: lastAssignment
                  ? // @ts-ignore
                    Math.ceil(
                      // @ts-ignore
                      (new Date() - lastAssignment) / (1000 * 60 * 60 * 24),
                    )
                  : null,
              },
            };
          },
        ),
      );

      // Sort by utilization rate (highest first)
      pitakUtilization.sort(
        (a, b) => b.utilization.utilizationRate - a.utilization.utilizationRate,
      );

      // Calculate overall statistics
      const overallStats = pitakUtilization.reduce(
        (acc, pitak) => {
          acc.totalPitaks++;
          acc.totalLuwang += pitak.totalLuwang;
          acc.totalAssignedLuwang += pitak.utilization.totalLuwangAssigned;
          acc.totalAssignments += pitak.utilization.totalAssignments;
          acc.totalActiveAssignments += pitak.utilization.activeAssignments;
          acc.totalUniqueWorkers += pitak.utilization.uniqueWorkers;
          acc.sumUtilizationRates += pitak.utilization.utilizationRate;
          return acc;
        },
        {
          totalPitaks: 0,
          totalLuwang: 0,
          totalAssignedLuwang: 0,
          totalAssignments: 0,
          totalActiveAssignments: 0,
          totalUniqueWorkers: 0,
          sumUtilizationRates: 0,
        },
      );

      const averageUtilizationRate =
        overallStats.totalPitaks > 0
          ? overallStats.sumUtilizationRates / overallStats.totalPitaks
          : 0;

      const overallUtilizationRate =
        overallStats.totalLuwang > 0
          ? (overallStats.totalAssignedLuwang / overallStats.totalLuwang) * 100
          : 0;

      // Categorize pitaks by utilization
      const categories = {
        high: [], // 80-100%
        medium: [], // 50-79%
        low: [], // 20-49%
        underutilized: [], // Below 20%
      };

      pitakUtilization.forEach((pitak) => {
        if (pitak.utilization.utilizationRate >= 80) {
          // @ts-ignore
          categories.high.push(pitak);
        } else if (pitak.utilization.utilizationRate >= 50) {
          // @ts-ignore
          categories.medium.push(pitak);
        } else if (pitak.utilization.utilizationRate >= 20) {
          // @ts-ignore
          categories.low.push(pitak);
        } else {
          // @ts-ignore
          categories.underutilized.push(pitak);
        }
      });

      // Get pitaks needing attention (underutilized or no recent assignments)
      const needsAttention = pitakUtilization
        .filter(
          (pitak) =>
            pitak.utilization.utilizationRate < 20 ||
            (pitak.utilization.daysSinceLastAssignment &&
              pitak.utilization.daysSinceLastAssignment > 30),
        )
        .slice(0, 10);

      // Get most utilized pitaks
      const mostUtilized = pitakUtilization.slice(0, 10);

      return {
        status: true,
        message: "Pitak utilization analysis retrieved",
        data: {
          pitakUtilization: pitakUtilization,
          overallMetrics: {
            totalPitaks: overallStats.totalPitaks,
            totalLuwang: overallStats.totalLuwang,
            totalAssignedLuwang: overallStats.totalAssignedLuwang,
            overallUtilizationRate: overallUtilizationRate,
            averageUtilizationRate: averageUtilizationRate,
            totalAssignments: overallStats.totalAssignments,
            totalActiveAssignments: overallStats.totalActiveAssignments,
            averageAssignmentsPerPitak:
              overallStats.totalPitaks > 0
                ? overallStats.totalAssignments / overallStats.totalPitaks
                : 0,
            averageWorkersPerPitak:
              overallStats.totalPitaks > 0
                ? overallStats.totalUniqueWorkers / overallStats.totalPitaks
                : 0,
          },
          categories: {
            high: {
              count: categories.high.length,
              pitaks: categories.high,
              percentage:
                overallStats.totalPitaks > 0
                  ? (categories.high.length / overallStats.totalPitaks) * 100
                  : 0,
            },
            medium: {
              count: categories.medium.length,
              pitaks: categories.medium,
              percentage:
                overallStats.totalPitaks > 0
                  ? (categories.medium.length / overallStats.totalPitaks) * 100
                  : 0,
            },
            low: {
              count: categories.low.length,
              pitaks: categories.low,
              percentage:
                overallStats.totalPitaks > 0
                  ? (categories.low.length / overallStats.totalPitaks) * 100
                  : 0,
            },
            underutilized: {
              count: categories.underutilized.length,
              pitaks: categories.underutilized,
              percentage:
                overallStats.totalPitaks > 0
                  ? (categories.underutilized.length /
                      overallStats.totalPitaks) *
                    100
                  : 0,
            },
          },
          mostUtilized: mostUtilized,
          needsAttention: needsAttention,
          recommendations:
            overallUtilizationRate < 60
              ? [
                  "Consider reassigning workers to underutilized pitaks",
                  "Review pitak status and available luwang",
                  "Plan assignments to maximize pitak utilization",
                ]
              : [
                  "Pitak utilization is at good levels",
                  "Continue monitoring utilization rates",
                  "Optimize assignment distribution",
                ],
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      console.error("getPitakUtilization error:", error);
      throw error;
    }
  }
}

module.exports = new AssignmentAnalytics();
