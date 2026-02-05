// dashboard/handlers/bukidAnalytics.js
// @ts-check

const { logger } = require("../../../../utils/logger");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

class BukidAnalyticsHandler {
  /**
   * Get overall summary of Bukid
   * @param {Object} repositories - All repositories
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Bukid overview data
   */
  // @ts-ignore
  async getBukidOverview(repositories, params) {
    try {
      // @ts-ignore
      // @ts-ignore
      const { bukid, pitak, assignment } = repositories;
      // @ts-ignore
      const { currentSession = false } = params;

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Total bukids
      const totalBukidsQuery = bukid.createQueryBuilder("b");
      if (currentSession) {
        totalBukidsQuery.where("b.session.id = :sessionId", { sessionId });
      }
      const totalBukids = await totalBukidsQuery.getCount();

      // Active bukids (with active pitaks)
      const activeBukidsQuery = bukid
        .createQueryBuilder("b")
        .leftJoin("b.pitaks", "p")
        .where("p.status = :status", { status: "active" });

      if (currentSession) {
        activeBukidsQuery.andWhere("b.session.id = :sessionId", { sessionId });
      }

      const activeBukids = await activeBukidsQuery.getCount();

      // Total pitaks per bukid
      const pitaksPerBukidQuery = bukid
        .createQueryBuilder("b")
        .leftJoin("b.pitaks", "p")
        .select(["b.id", "b.name", "COUNT(p.id) as pitakCount"])
        .groupBy("b.id")
        .orderBy("pitakCount", "DESC");

      if (currentSession) {
        pitaksPerBukidQuery.where("b.session.id = :sessionId", { sessionId });
      }

      const pitaksPerBukid = await pitaksPerBukidQuery.getRawMany();

      // Total luwang per bukid
      const luwangPerBukidQuery = assignment
        .createQueryBuilder("a")
        .leftJoin("a.pitak", "p")
        .leftJoin("p.bukid", "b")
        .select(["b.id", "b.name", "SUM(a.luwangCount) as totalLuwang"])
        .where("a.status = :status", { status: "completed" })
        .groupBy("b.id")
        .orderBy("totalLuwang", "DESC");

      if (currentSession) {
        luwangPerBukidQuery.andWhere("a.session.id = :sessionId", {
          sessionId,
        });
      }

      const luwangPerBukid = await luwangPerBukidQuery.getRawMany();

      return {
        status: true,
        message: "Bukid overview retrieved successfully",
        data: {
          summary: {
            totalBukids,
            activeBukids,
            inactiveBukids: totalBukids - activeBukids,
          },
          distribution: pitaksPerBukid.map(
            (
              /** @type {{ b_id: any; b_name: any; pitakCount: string; }} */ b,
            ) => ({
              bukidId: b.b_id,
              bukidName: b.b_name,
              pitakCount: parseInt(b.pitakCount) || 0,
            }),
          ),
          production: luwangPerBukid.map(
            (
              /** @type {{ b_id: any; b_name: any; totalLuwang: string; }} */ b,
            ) => ({
              bukidId: b.b_id,
              bukidName: b.b_name,
              totalLuwang: parseFloat(b.totalLuwang) || 0,
            }),
          ),
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      // @ts-ignore
      logger.error("Error in getBukidOverview:", error);
      throw error;
    }
  }

  /**
   * Get detailed analytics for a specific bukid
   * @param {Object} repositories - All repositories
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Detailed bukid analytics
   */
  async getBukidDetails(repositories, params) {
    try {
      // @ts-ignore
      const { bukidId, currentSession = false } = params;
      if (!bukidId) {
        throw new Error("bukidId is required");
      }

      // @ts-ignore
      const { bukid, pitak, assignment, payment, worker } = repositories;

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Get bukid information
      const bukidInfo = await bukid.findOne({
        where: { id: bukidId },
        relations: ["pitaks"],
      });

      if (!bukidInfo) {
        throw new Error("Bukid not found");
      }

      // Get pitaks under this bukid
      const pitaks = await pitak.find({
        where: { bukid: { id: bukidId } },
        relations: ["assignments", "assignments.worker"],
      });

      // Calculate pitak statistics
      const pitakStats = pitaks.map(
        (
          /** @type {{ assignments: any[]; id: any; location: any; status: any; }} */ p,
        ) => {
          const completedAssignments = p.assignments.filter(
            (/** @type {{ status: string; }} */ a) => a.status === "completed",
          );
          const activeAssignments = p.assignments.filter(
            (/** @type {{ status: string; }} */ a) => a.status === "active",
          );
          const totalLuwang = completedAssignments.reduce(
            (
              /** @type {number} */ sum,
              /** @type {{ luwangCount: string; }} */ a,
            ) => sum + parseFloat(a.luwangCount),
            0,
          );

          return {
            id: p.id,
            location: p.location,
            status: p.status,
            totalAssignments: p.assignments.length,
            activeAssignments: activeAssignments.length,
            completedAssignments: completedAssignments.length,
            totalLuwang,
            workers: [
              ...new Set(
                p.assignments
                  .map(
                    (/** @type {{ worker: { name: any; }; }} */ a) =>
                      a.worker?.name,
                  )
                  .filter(Boolean),
              ),
            ],
          };
        },
      );

      // Get assignments for this bukid
      const assignmentsQuery = assignment
        .createQueryBuilder("a")
        .leftJoinAndSelect("a.worker", "worker")
        .leftJoinAndSelect("a.pitak", "pitak")
        .where("pitak.bukid.id = :bukidId", { bukidId })
        .orderBy("a.assignmentDate", "DESC");

      if (currentSession) {
        assignmentsQuery.andWhere("a.session.id = :sessionId", { sessionId });
      }

      const assignments = await assignmentsQuery.getMany();

      // Calculate assignment statistics
      const assignmentStats = {
        total: assignments.length,
        active: assignments.filter(
          (/** @type {{ status: string; }} */ a) => a.status === "active",
        ).length,
        completed: assignments.filter(
          (/** @type {{ status: string; }} */ a) => a.status === "completed",
        ).length,
        cancelled: assignments.filter(
          (/** @type {{ status: string; }} */ a) => a.status === "cancelled",
        ).length,
        byMonth: this.groupAssignmentsByMonth(assignments),
      };

      // Get payments related to this bukid
      const paymentsQuery = payment
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.worker", "worker")
        .leftJoin("p.pitak", "pt")
        .leftJoin("pt.bukid", "b")
        .where("b.id = :bukidId", { bukidId })
        .orderBy("p.paymentDate", "DESC");

      if (currentSession) {
        paymentsQuery.andWhere("p.session.id = :sessionId", { sessionId });
      }

      const payments = await paymentsQuery.getMany();

      // Calculate financial statistics
      const financialStats = {
        totalPayments: payments.length,
        totalGrossPay: payments.reduce(
          (/** @type {number} */ sum, /** @type {{ grossPay: string; }} */ p) =>
            sum + parseFloat(p.grossPay),
          0,
        ),
        totalNetPay: payments.reduce(
          (/** @type {number} */ sum, /** @type {{ netPay: string; }} */ p) =>
            sum + parseFloat(p.netPay),
          0,
        ),
        totalDeductions: payments.reduce(
          (
            /** @type {number} */ sum,
            /** @type {{ manualDeduction: string; }} */ p,
          ) => sum + (parseFloat(p.manualDeduction) || 0),
          0,
        ),
        byStatus: payments.reduce(
          (
            /** @type {{ [x: string]: any; }} */ acc,
            /** @type {{ status: string | number; }} */ p,
          ) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          },
          {},
        ),
      };

      // Get workers who worked on this bukid
      const workersQuery = worker
        .createQueryBuilder("w")
        .innerJoin("w.assignments", "a")
        .innerJoin("a.pitak", "p")
        .innerJoin("p.bukid", "b")
        .where("b.id = :bukidId", { bukidId })
        .select(["w.id", "w.name", "w.status"])
        .addSelect("COUNT(a.id)", "assignmentCount")
        .addSelect("SUM(a.luwangCount)", "totalLuwang")
        .groupBy("w.id");

      if (currentSession) {
        workersQuery.andWhere("a.session.id = :sessionId", { sessionId });
      }

      const workers = await workersQuery.getRawMany();

      return {
        status: true,
        message: "Bukid details retrieved successfully",
        data: {
          bukidInfo,
          pitaks: pitakStats,
          assignments: assignmentStats,
          financials: financialStats,
          workers: workers.map(
            (
              /** @type {{ w_id: any; w_name: any; w_status: any; assignmentCount: string; totalLuwang: string; }} */ w,
            ) => ({
              id: w.w_id,
              name: w.w_name,
              status: w.w_status,
              assignmentCount: parseInt(w.assignmentCount) || 0,
              totalLuwang: parseFloat(w.totalLuwang) || 0,
            }),
          ),
          summary: {
            totalPitaks: pitaks.length,
            activePitaks: pitaks.filter(
              (/** @type {{ status: string; }} */ p) => p.status === "active",
            ).length,
            totalWorkers: workers.length,
            totalLuwang: pitakStats.reduce(
              (
                /** @type {any} */ sum,
                /** @type {{ totalLuwang: any; }} */ p,
              ) => sum + p.totalLuwang,
              0,
            ),
            totalPayments: payments.length,
          },
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      // @ts-ignore
      logger.error("Error in getBukidDetails:", error);
      throw error;
    }
  }

  /**
   * Get production trend for bukid
   * @param {Object} repositories - All repositories
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Production trend data
   */
  async getBukidProductionTrend(repositories, params) {
    try {
      // @ts-ignore
      const {
        // @ts-ignore
        bukidId,
        // @ts-ignore
        startDate,
        // @ts-ignore
        endDate,
        // @ts-ignore
        interval = "monthly",
        // @ts-ignore
        currentSession = false,
      } = params;
      // @ts-ignore
      // @ts-ignore
      const { assignment, pitak } = repositories;

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      const query = assignment
        .createQueryBuilder("a")
        .leftJoin("a.pitak", "p")
        .leftJoin("p.bukid", "b")
        .select(this.getDateGrouping(interval, "a.assignmentDate"))
        .addSelect("SUM(a.luwangCount)", "totalLuwang")
        .addSelect("COUNT(a.id)", "assignmentCount")
        .where("a.status = :status", { status: "completed" })
        .groupBy(this.getDateGrouping(interval, "a.assignmentDate"))
        .orderBy("period", "ASC");

      if (bukidId) {
        query.andWhere("b.id = :bukidId", { bukidId });
      }

      if (startDate && endDate) {
        query.andWhere("a.assignmentDate BETWEEN :start AND :end", {
          start: new Date(startDate),
          end: new Date(endDate),
        });
      }

      if (currentSession) {
        query.andWhere("a.session.id = :sessionId", { sessionId });
      }

      const trendData = await query.getRawMany();

      return {
        status: true,
        message: "Production trend retrieved successfully",
        data: {
          interval,
          trend: trendData.map(
            (
              /** @type {{ period: any; totalLuwang: string; assignmentCount: string; }} */ row,
            ) => ({
              period: row.period,
              totalLuwang: parseFloat(row.totalLuwang) || 0,
              assignmentCount: parseInt(row.assignmentCount) || 0,
              averageLuwang:
                parseFloat(row.totalLuwang) / parseInt(row.assignmentCount) ||
                0,
            }),
          ),
          summary: {
            totalPeriods: trendData.length,
            totalLuwang: trendData.reduce(
              (
                /** @type {number} */ sum,
                /** @type {{ totalLuwang: string; }} */ row,
              ) => sum + parseFloat(row.totalLuwang),
              0,
            ),
            totalAssignments: trendData.reduce(
              (
                /** @type {number} */ sum,
                /** @type {{ assignmentCount: string; }} */ row,
              ) => sum + parseInt(row.assignmentCount),
              0,
            ),
          },
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      // @ts-ignore
      logger.error("Error in getBukidProductionTrend:", error);
      throw error;
    }
  }

  /**
   * Get worker distribution across pitaks in bukid
   * @param {Object} repositories - All repositories
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Worker distribution data
   */
  async getBukidWorkerDistribution(repositories, params) {
    try {
      // @ts-ignore
      const { bukidId, currentSession = false } = params;
      if (!bukidId) {
        throw new Error("bukidId is required");
      }

      // @ts-ignore
      // @ts-ignore
      const { assignment, pitak, worker } = repositories;

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Get workers per pitak
      const workerDistributionQuery = pitak
        .createQueryBuilder("p")
        .leftJoin("p.assignments", "a")
        .leftJoin("a.worker", "w")
        .select(["p.id", "p.location", "p.status"])
        .addSelect("COUNT(DISTINCT w.id)", "workerCount")
        .addSelect("GROUP_CONCAT(DISTINCT w.name)", "workerNames")
        .where("p.bukid = :bukidId", { bukidId })
        .groupBy("p.id")
        .orderBy("workerCount", "DESC");

      if (currentSession) {
        workerDistributionQuery.andWhere("a.session.id = :sessionId", {
          sessionId,
        });
      }

      const workerDistribution = await workerDistributionQuery.getRawMany();

      // Get pitaks per worker
      const pitakDistributionQuery = worker
        .createQueryBuilder("w")
        .leftJoin("w.assignments", "a")
        .leftJoin("a.pitak", "p")
        .select(["w.id", "w.name", "w.status"])
        .addSelect("COUNT(DISTINCT p.id)", "pitakCount")
        .addSelect("GROUP_CONCAT(DISTINCT p.location)", "pitakLocations")
        .where("p.bukid = :bukidId", { bukidId })
        .groupBy("w.id")
        .orderBy("pitakCount", "DESC");

      if (currentSession) {
        pitakDistributionQuery.andWhere("a.session.id = :sessionId", {
          sessionId,
        });
      }

      const pitakDistribution = await pitakDistributionQuery.getRawMany();

      return {
        status: true,
        message: "Worker distribution retrieved successfully",
        data: {
          workersPerPitak: workerDistribution.map(
            (
              /** @type {{ p_id: any; p_location: any; p_status: any; workerCount: string; workerNames: string; }} */ p,
            ) => ({
              pitakId: p.p_id,
              pitakLocation: p.p_location,
              status: p.p_status,
              workerCount: parseInt(p.workerCount) || 0,
              workerNames: p.workerNames ? p.workerNames.split(",") : [],
            }),
          ),
          pitaksPerWorker: pitakDistribution.map(
            (
              /** @type {{ w_id: any; w_name: any; w_status: any; pitakCount: string; pitakLocations: string; }} */ w,
            ) => ({
              workerId: w.w_id,
              workerName: w.w_name,
              status: w.w_status,
              pitakCount: parseInt(w.pitakCount) || 0,
              pitakLocations: w.pitakLocations
                ? w.pitakLocations.split(",")
                : [],
            }),
          ),
          summary: {
            totalPitaks: workerDistribution.length,
            totalWorkers: pitakDistribution.length,
            avgWorkersPerPitak:
              workerDistribution.reduce(
                (
                  /** @type {number} */ sum,
                  /** @type {{ workerCount: string; }} */ p,
                ) => sum + parseInt(p.workerCount),
                0,
              ) / workerDistribution.length || 0,
            avgPitaksPerWorker:
              pitakDistribution.reduce(
                (
                  /** @type {number} */ sum,
                  /** @type {{ pitakCount: string; }} */ w,
                ) => sum + parseInt(w.pitakCount),
                0,
              ) / pitakDistribution.length || 0,
          },
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      // @ts-ignore
      logger.error("Error in getBukidWorkerDistribution:", error);
      throw error;
    }
  }

  /**
   * Get financial summary for bukid
   * @param {Object} repositories - All repositories
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Financial summary data
   */
  async getBukidFinancialSummary(repositories, params) {
    try {
      // @ts-ignore
      const { bukidId, startDate, endDate, currentSession = false } = params;
      if (!bukidId) {
        throw new Error("bukidId is required");
      }

      // @ts-ignore
      const { payment, assignment } = repositories;

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      // Get payments for this bukid
      const query = payment
        .createQueryBuilder("p")
        .leftJoin("p.pitak", "pt")
        .leftJoin("pt.bukid", "b")
        .leftJoin("p.worker", "w")
        .select([
          "p.id",
          "p.grossPay",
          "p.manualDeduction",
          "p.netPay",
          "p.status",
          "p.paymentDate",
          "w.name as workerName",
          "pt.location as pitakLocation",
        ])
        .where("b.id = :bukidId", { bukidId })
        .orderBy("p.paymentDate", "DESC");

      if (startDate && endDate) {
        query.andWhere("p.paymentDate BETWEEN :start AND :end", {
          start: new Date(startDate),
          end: new Date(endDate),
        });
      }

      if (currentSession) {
        query.andWhere("p.session.id = :sessionId", { sessionId });
      }

      const payments = await query.getRawMany();

      // Get assignments for luwang calculation
      const assignmentsQuery = assignment
        .createQueryBuilder("a")
        .leftJoin("a.pitak", "p")
        .leftJoin("p.bukid", "b")
        .select(["SUM(a.luwangCount)", "totalLuwang"])
        .where("b.id = :bukidId", { bukidId })
        .andWhere("a.status = :status", { status: "completed" });

      if (currentSession) {
        assignmentsQuery.andWhere("a.session.id = :sessionId", { sessionId });
      }

      const assignments = await assignmentsQuery.getRawOne();

      // Calculate financial metrics
      const totalGrossPay = payments.reduce(
        (
          /** @type {number} */ sum,
          /** @type {{ p_gross_pay: string; }} */ p,
        ) => sum + parseFloat(p.p_gross_pay),
        0,
      );
      const totalNetPay = payments.reduce(
        (/** @type {number} */ sum, /** @type {{ p_net_pay: string; }} */ p) =>
          sum + parseFloat(p.p_net_pay),
        0,
      );
      const totalDeductions = payments.reduce(
        (
          /** @type {number} */ sum,
          /** @type {{ p_manual_deduction: string; }} */ p,
        ) => sum + (parseFloat(p.p_manual_deduction) || 0),
        0,
      );
      const totalLuwang = parseFloat(assignments?.totalLuwang) || 0;

      const paymentByStatus = payments.reduce(
        (
          /** @type {{ [x: string]: { amount: number; }; }} */ acc,
          /** @type {{ p_status: any; p_net_pay: string; }} */ p,
        ) => {
          const status = p.p_status;
          acc[status] = acc[status] || { count: 0, amount: 0 };
          // @ts-ignore
          acc[status].count += 1;
          acc[status].amount += parseFloat(p.p_net_pay);
          return acc;
        },
        {},
      );

      return {
        status: true,
        message: "Financial summary retrieved successfully",
        data: {
          payments: payments.map(
            (
              /** @type {{ p_id: any; p_gross_pay: string; p_manual_deduction: string; p_net_pay: string; p_status: any; p_payment_date: any; workerName: any; pitakLocation: any; }} */ p,
            ) => ({
              id: p.p_id,
              grossPay: parseFloat(p.p_gross_pay),
              manualDeduction: parseFloat(p.p_manual_deduction) || 0,
              netPay: parseFloat(p.p_net_pay),
              status: p.p_status,
              paymentDate: p.p_payment_date,
              workerName: p.workerName,
              pitakLocation: p.pitakLocation,
            }),
          ),
          summary: {
            totalPayments: payments.length,
            totalGrossPay,
            totalNetPay,
            totalDeductions,
            totalLuwang,
            averagePayPerLuwang: totalGrossPay / totalLuwang || 0,
            deductionRate: (totalDeductions / totalGrossPay) * 100 || 0,
          },
          byStatus: paymentByStatus,
          timeline: this.groupPaymentsByMonth(payments),
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      // @ts-ignore
      logger.error("Error in getBukidFinancialSummary:", error);
      throw error;
    }
  }

  /**
   * Compare multiple bukids
   * @param {Object} repositories - All repositories
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Bukid comparison data
   */
  async compareBukids(repositories, params) {
    try {
      // @ts-ignore
      // @ts-ignore
      const { bukidIds = [], metrics = [], currentSession = false } = params;
      // @ts-ignore
      const { bukid, pitak, assignment, payment } = repositories;

      if (!bukidIds.length) {
        throw new Error("At least one bukidId is required");
      }

      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }

      const comparisonData = await Promise.all(
        bukidIds.map(async (/** @type {any} */ bukidId) => {
          // Get bukid info
          const bukidInfo = await bukid.findOne({
            where: { id: bukidId },
          });

          // Get pitak count
          const pitakCountQuery = pitak
            .createQueryBuilder("p")
            .where("p.bukid = :bukidId", { bukidId });

          if (currentSession) {
            pitakCountQuery.andWhere("p.bukid.session.id = :sessionId", {
              sessionId,
            });
          }

          const pitakCount = await pitakCountQuery.getCount();

          // Get assignment statistics
          const assignmentStatsQuery = assignment
            .createQueryBuilder("a")
            .leftJoin("a.pitak", "p")
            .leftJoin("p.bukid", "b")
            .select([
              "COUNT(a.id) as totalAssignments",
              "SUM(CASE WHEN a.status = 'completed' THEN a.luwangCount ELSE 0 END) as totalLuwang",
              "SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as activeAssignments",
            ])
            .where("b.id = :bukidId", { bukidId });

          if (currentSession) {
            assignmentStatsQuery.andWhere("a.session.id = :sessionId", {
              sessionId,
            });
          }

          const assignmentStats = await assignmentStatsQuery.getRawOne();

          // Get payment statistics
          const paymentStatsQuery = payment
            .createQueryBuilder("p")
            .leftJoin("p.pitak", "pt")
            .leftJoin("pt.bukid", "b")
            .select([
              "COUNT(p.id) as totalPayments",
              "SUM(p.grossPay) as totalGrossPay",
              "SUM(p.netPay) as totalNetPay",
              "SUM(p.manualDeduction) as totalDeductions",
            ])
            .where("b.id = :bukidId", { bukidId });

          if (currentSession) {
            paymentStatsQuery.andWhere("p.session.id = :sessionId", {
              sessionId,
            });
          }

          const paymentStats = await paymentStatsQuery.getRawOne();

          return {
            bukidId,
            name: bukidInfo?.name,
            metrics: {
              pitaks: pitakCount,
              totalAssignments:
                parseInt(assignmentStats?.totalAssignments) || 0,
              activeAssignments:
                parseInt(assignmentStats?.activeAssignments) || 0,
              totalLuwang: parseFloat(assignmentStats?.totalLuwang) || 0,
              totalPayments: parseInt(paymentStats?.totalPayments) || 0,
              totalGrossPay: parseFloat(paymentStats?.totalGrossPay) || 0,
              totalNetPay: parseFloat(paymentStats?.totalNetPay) || 0,
              totalDeductions: parseFloat(paymentStats?.totalDeductions) || 0,
              efficiency:
                parseFloat(assignmentStats?.totalLuwang) / pitakCount || 0,
            },
          };
        }),
      );

      // Calculate rankings
      // @ts-ignore
      comparisonData.forEach(
        (
          /** @type {{ rankings: { [x: string]: { value: any; rank: any; percentile: number; }; }; metrics: { [x: string]: any; }; }} */ bukid,
          // @ts-ignore
          /** @type {any} */ index,
        ) => {
          bukid.rankings = {};
          Object.keys(bukid.metrics).forEach((metric) => {
            const values = comparisonData.map(
              (/** @type {{ metrics: { [x: string]: any; }; }} */ b) =>
                b.metrics[metric],
            );
            const max = Math.max(...values);
            const min = Math.min(...values);
            const value = bukid.metrics[metric];

            bukid.rankings[metric] = {
              value,
              rank:
                values
                  .sort(
                    (/** @type {number} */ a, /** @type {number} */ b) => b - a,
                  )
                  .indexOf(value) + 1,
              percentile: ((value - min) / (max - min)) * 100 || 0,
            };
          });
        },
      );

      return {
        status: true,
        message: "Bukid comparison completed successfully",
        data: {
          bukids: comparisonData,
          summary: {
            totalBukids: comparisonData.length,
            averagePitaks:
              comparisonData.reduce(
                (
                 /** @type {any} */ sum,
                /** @type {{ metrics: { pitaks: any; }; }} */ b,
                ) => sum + b.metrics.pitaks,
                0,
              ) / comparisonData.length,
            averageLuwang:
              comparisonData.reduce(
                (
                 /** @type {any} */ sum,
                  /** @type {{ metrics: { totalLuwang: any; }; }} */ b,
                ) => sum + b.metrics.totalLuwang,
                0,
              ) / comparisonData.length,
            averageEfficiency:
              comparisonData.reduce(
                (
               /** @type {any} */ sum,
                   /** @type {{ metrics: { efficiency: any; }; }} */ b,
                ) => sum + b.metrics.efficiency,
                0,
              ) / comparisonData.length,
          },
          filters: {
            currentSession: currentSession,
          },
        },
      };
    } catch (error) {
      // @ts-ignore
      logger.error("Error in compareBukids:", error);
      throw error;
    }
  }

  /**
   * @param {any[]} assignments
   */
  groupAssignmentsByMonth(assignments) {
    const grouped = {};

    assignments.forEach(
      (
        /** @type {{ assignmentDate: string | number | Date; luwangCount: string; }} */ assignment,
      ) => {
        if (assignment.assignmentDate) {
          const date = new Date(assignment.assignmentDate);
          const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

          // @ts-ignore
          if (!grouped[monthYear]) {
            // @ts-ignore
            grouped[monthYear] = {
              assignments: 0,
              luwang: 0,
            };
          }

          // @ts-ignore
          grouped[monthYear].assignments++;
          // @ts-ignore
          grouped[monthYear].luwang += parseFloat(assignment.luwangCount) || 0;
        }
      },
    );

    return Object.entries(grouped)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * @param {any[]} payments
   */
  groupPaymentsByMonth(payments) {
    const grouped = {};

    payments.forEach(
      (
        /** @type {{ p_payment_date: string | number | Date; p_gross_pay: string; p_net_pay: string; p_manual_deduction: string; }} */ payment,
      ) => {
        if (payment.p_payment_date) {
          const date = new Date(payment.p_payment_date);
          const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

          // @ts-ignore
          if (!grouped[monthYear]) {
            // @ts-ignore
            grouped[monthYear] = {
              count: 0,
              grossPay: 0,
              netPay: 0,
              deductions: 0,
            };
          }

          // @ts-ignore
          grouped[monthYear].count++;
          // @ts-ignore
          grouped[monthYear].grossPay += parseFloat(payment.p_gross_pay) || 0;
          // @ts-ignore
          grouped[monthYear].netPay += parseFloat(payment.p_net_pay) || 0;
          // @ts-ignore
          grouped[monthYear].deductions +=
            parseFloat(payment.p_manual_deduction) || 0;
        }
      },
    );

    return Object.entries(grouped)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Helper: Get SQL date grouping based on interval
   * @param {string} interval - Time interval
   * @param {string} column - Date column
   * @returns {string} SQL grouping expression
   */
  getDateGrouping(interval, column) {
    switch (interval) {
      case "daily":
        return `DATE(${column}) as period`;
      case "weekly":
        return `STRFTIME('%Y-%W', ${column}) as period`;
      case "monthly":
        return `STRFTIME('%Y-%m', ${column}) as period`;
      case "quarterly":
        return `STRFTIME('%Y', ${column}) || '-' || ((CAST(STRFTIME('%m', ${column}) AS INTEGER) - 1) / 3 + 1) as period`;
      case "yearly":
        return `STRFTIME('%Y', ${column}) as period`;
      default:
        return `STRFTIME('%Y-%m', ${column}) as period`;
    }
  }
}

module.exports = new BukidAnalyticsHandler();
