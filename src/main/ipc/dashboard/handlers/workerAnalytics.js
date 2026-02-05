// dashboard/handlers/workerAnalytics.js
//@ts-check
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

class WorkerAnalytics {
  /**
   * Get workers overview
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Workers overview data
   */
  async getWorkersOverview(repositories, params) {
    // @ts-ignore
    const { worker: workerRepo, assignment: assignmentRepo, debt: debtRepo } = repositories;
    // @ts-ignore
    const { currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get total workers
      const totalWorkers = await workerRepo.count();
      
      // Get workers by status
      const activeWorkers = await workerRepo.count({ 
        where: { status: 'active' } 
      });
      
      const inactiveWorkers = await workerRepo.count({ 
        where: { status: 'inactive' } 
      });
      
      const onLeaveWorkers = await workerRepo.count({ 
        where: { status: 'on-leave' } 
      });
      
      // Get total debt with session filter
      const totalDebtQuery = workerRepo
        .createQueryBuilder("worker")
        .select("SUM(worker.totalDebt)", "total");
      
      if (currentSession && sessionId) {
        // Need to filter workers by session through assignments or debts
        totalDebtQuery
          .leftJoin("worker.debts", "debts")
          .where("debts.session.id = :sessionId", { sessionId })
          .orWhere("worker.id NOT IN (SELECT DISTINCT d.workerId FROM Debt d WHERE d.session.id = :sessionId)")
          .setParameter("sessionId", sessionId);
      }
      
      const totalDebtResult = await totalDebtQuery.getRawOne();
      
      const totalDebt = parseFloat(totalDebtResult?.total) || 0;
      
      // Get average debt per worker
      const averageDebt = totalWorkers > 0 ? totalDebt / totalWorkers : 0;
      
      // Get workers with highest debt with session filter
      let topDebtorsQuery = workerRepo.find({
        select: ['id', 'name', 'totalDebt', 'currentBalance'],
        where: { totalDebt: { $gt: 0 } },
        order: { totalDebt: 'DESC' },
        take: 5
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        topDebtorsQuery = workerRepo
          .createQueryBuilder("worker")
          .leftJoin("worker.debts", "debts")
          .select([
            "worker.id",
            "worker.name",
            "SUM(debts.amount) as totalDebt",
            "SUM(debts.balance) as currentBalance"
          ])
          .where("debts.session.id = :sessionId", { sessionId })
          .groupBy("worker.id")
          .addGroupBy("worker.name")
          .orderBy("totalDebt", "DESC")
          .take(5)
          .getRawMany();
      }
      
      const topDebtors = await topDebtorsQuery;
      
      // Get active assignments count with session filter
      let activeAssignmentsQuery = assignmentRepo.count({
        where: { status: 'active' }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        activeAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.status = :status", { status: 'active' })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const activeAssignments = await activeAssignmentsQuery;
      
      // Get average assignments per worker
      const avgAssignments = totalWorkers > 0 ? activeAssignments / totalWorkers : 0;
      
      return {
        status: true,
        message: "Workers overview retrieved successfully",
        data: {
          summary: {
            total: totalWorkers,
            active: activeWorkers,
            inactive: inactiveWorkers,
            onLeave: onLeaveWorkers,
            activePercentage: totalWorkers > 0 ? (activeWorkers / totalWorkers * 100) : 0
          },
          financial: {
            totalDebt: totalDebt,
            averageDebt: averageDebt,
            topDebtors: Array.isArray(topDebtors) ? topDebtors.map(d => ({
              id: d.worker_id || d.id,
              name: d.worker_name || d.name,
              totalDebt: parseFloat(d.totalDebt) || parseFloat(d.totalDebt) || 0,
              currentBalance: parseFloat(d.currentBalance) || parseFloat(d.currentBalance) || 0
            })) : topDebtors
          },
          assignments: {
            active: activeAssignments,
            averagePerWorker: avgAssignments
          },
          lastUpdated: new Date(),
          filters: {
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getWorkersOverview error:", error);
      throw error;
    }
  }
  
  /**
   * Get worker performance data
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Worker performance data
   */
  async getWorkerPerformance(repositories, params) {
    // @ts-ignore
    const { worker: workerRepo, assignment: assignmentRepo, payment: paymentRepo } = repositories;
    // @ts-ignore
    const { period = 'month', limit = 10, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Calculate date range
      const date = new Date();
      let startDate;
      
      switch(period) {
        case 'week':
          startDate = new Date(date.setDate(date.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(date.setMonth(date.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(date.setMonth(date.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(date.setFullYear(date.getFullYear() - 1));
          break;
        default:
          startDate = new Date(date.setMonth(date.getMonth() - 1));
      }
      
      // Get assignments completed in period with session filter
      const completedAssignmentsQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          "assignment.workerId",
          "worker.name",
          "COUNT(assignment.id) as assignmentCount",
          "SUM(assignment.luwangCount) as totalLuwang"
        ])
        .leftJoin("assignment.worker", "worker")
        .where("assignment.status = :status", { status: 'completed' })
        .andWhere("assignment.updatedAt >= :startDate", { startDate });
      
      if (currentSession && sessionId) {
        completedAssignmentsQuery.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      const completedAssignments = await completedAssignmentsQuery
        .groupBy("assignment.workerId")
        .addGroupBy("worker.name")
        .orderBy("assignmentCount", "DESC")
        .limit(limit)
        .getRawMany();
      
      // Get payments received in period with session filter
      const workerPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "payment.workerId",
          "SUM(payment.grossPay) as totalGross",
          "SUM(payment.netPay) as totalNet",
          "COUNT(payment.id) as paymentCount"
        ])
        .where("payment.paymentDate >= :startDate", { startDate });
      
      if (currentSession && sessionId) {
        workerPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const workerPayments = await workerPaymentsQuery
        .groupBy("payment.workerId")
        .getRawMany();
      
      // Combine data
      const performanceData = completedAssignments.map((/** @type {{ assignment_workerId: any; worker_name: any; assignmentCount: string; totalLuwang: string; }} */ item) => {
        const payment = workerPayments.find((/** @type {{ payment_workerId: any; }} */ p) => p.payment_workerId === item.assignment_workerId);
        return {
          workerId: item.assignment_workerId,
          workerName: item.worker_name,
          assignmentsCompleted: parseInt(item.assignmentCount),
          totalLuwang: parseFloat(item.totalLuwang),
          totalGrossPay: payment ? parseFloat(payment.totalGross) : 0,
          totalNetPay: payment ? parseFloat(payment.totalNet) : 0,
          paymentCount: payment ? parseInt(payment.paymentCount) : 0,
          productivityScore: parseFloat(item.totalLuwang) / (parseInt(item.assignmentCount) || 1)
        };
      });
      
      return {
        status: true,
        message: "Worker performance data retrieved",
        data: {
          period: {
            start: startDate,
            end: new Date(),
            type: period
          },
          performance: performanceData,
          metrics: {
            totalWorkers: performanceData.length,
            totalAssignments: performanceData.reduce((/** @type {any} */ sum, /** @type {{ assignmentsCompleted: any; }} */ item) => sum + item.assignmentsCompleted, 0),
            totalLuwang: performanceData.reduce((/** @type {any} */ sum, /** @type {{ totalLuwang: any; }} */ item) => sum + item.totalLuwang, 0),
            averageProductivity: performanceData.length > 0 
              ? performanceData.reduce((/** @type {any} */ sum, /** @type {{ productivityScore: any; }} */ item) => sum + item.productivityScore, 0) / performanceData.length 
              : 0
          },
          filters: {
            period: period,
            limit: limit,
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getWorkerPerformance error:", error);
      throw error;
    }
  }
  
  /**
   * Get worker status summary
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Worker status summary
   */
  async getWorkerStatusSummary(repositories, params) {
    // @ts-ignore
    const { worker: workerRepo } = repositories;
    // @ts-ignore
    const { currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get workers grouped by status
      const statusSummaryQuery = workerRepo
        .createQueryBuilder("worker")
        .select([
          "worker.status",
          "COUNT(worker.id) as count",
          "SUM(worker.totalDebt) as totalDebt",
          "AVG(worker.totalDebt) as avgDebt"
        ])
        .groupBy("worker.status");
      
      // Note: Worker status is not session-specific, but we could filter by workers with assignments in session
      if (currentSession && sessionId) {
        statusSummaryQuery
          .leftJoin("worker.assignments", "assignments")
          .where("assignments.session.id = :sessionId", { sessionId })
          .orWhere("worker.id NOT IN (SELECT DISTINCT a.workerId FROM Assignment a WHERE a.session.id = :sessionId)")
          .setParameter("sessionId", sessionId);
      }
      
      const statusSummary = await statusSummaryQuery.getRawMany();
      
      // Get recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentHires = await workerRepo.find({
        where: {
          hireDate: { $gte: thirtyDaysAgo }
        },
        order: { hireDate: 'DESC' },
        take: 10
      });
      
      return {
        status: true,
        message: "Worker status summary retrieved",
        data: {
          statusDistribution: statusSummary.map((/** @type {{ worker_status: any; count: string; totalDebt: string; avgDebt: string; }} */ item) => ({
            status: item.worker_status,
            count: parseInt(item.count),
            totalDebt: parseFloat(item.totalDebt) || 0,
            averageDebt: parseFloat(item.avgDebt) || 0
          })),
          recentHires: recentHires,
          filters: {
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getWorkerStatusSummary error:", error);
      throw error;
    }
  }
  
  /**
   * Get top performers
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Top performers data
   */
  async getTopPerformers(repositories, params) {
    // @ts-ignore
    const { worker: workerRepo, assignment: assignmentRepo, payment: paymentRepo } = repositories;
    // @ts-ignore
    const { timeFrame = 'month', category = 'productivity', limit = 5, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      let performers = [];
      
      if (category === 'productivity') {
        // Top performers by assignments completed with session filter
        const performersQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .select([
            "worker.id as workerId",
            "worker.name as workerName",
            "COUNT(assignment.id) as completedAssignments",
            "SUM(assignment.luwangCount) as totalLuwang",
            "AVG(assignment.luwangCount) as avgLuwangPerAssignment"
          ])
          .leftJoin("assignment.worker", "worker")
          .where("assignment.status = :status", { status: 'completed' });
        
        if (currentSession && sessionId) {
          performersQuery.andWhere("assignment.session.id = :sessionId", { sessionId });
        }
          
        const performersData = await performersQuery
          .groupBy("worker.id")
          .addGroupBy("worker.name")
          .orderBy("completedAssignments", "DESC")
          .limit(limit)
          .getRawMany();
          
        performers = performersData.map((/** @type {{ workerId: any; workerName: any; completedAssignments: string; totalLuwang: string; }} */ item) => ({
          workerId: item.workerId,
          workerName: item.workerName,
          metric: 'Assignments Completed',
          value: parseInt(item.completedAssignments),
          secondaryValue: parseFloat(item.totalLuwang),
          secondaryLabel: 'Total Luwang'
        }));
        
      } else if (category === 'lowest_debt') {
        // Workers with lowest debt with session filter
        let lowestDebtQuery = workerRepo
          .createQueryBuilder("worker")
          .select([
            "worker.id",
            "worker.name",
            "worker.totalDebt",
            "worker.currentBalance"
          ])
          .where("worker.totalDebt > 0")
          .orderBy("worker.totalDebt", "ASC")
          .limit(limit);
        
        if (currentSession && sessionId) {
          // Filter workers by debts in current session
          lowestDebtQuery
            .leftJoin("worker.debts", "debts")
            .where("debts.session.id = :sessionId", { sessionId })
            .andWhere("worker.totalDebt > 0")
            .groupBy("worker.id")
            .addGroupBy("worker.name")
            .addGroupBy("worker.totalDebt")
            .addGroupBy("worker.currentBalance");
        }
          
        const lowestDebtData = await lowestDebtQuery.getMany();
          
        performers = lowestDebtData.map((/** @type {{ id: any; name: any; totalDebt: string; currentBalance: string; }} */ item) => ({
          workerId: item.id,
          workerName: item.name,
          metric: 'Debt Balance',
          value: parseFloat(item.totalDebt),
          secondaryValue: parseFloat(item.currentBalance),
          secondaryLabel: 'Current Balance'
        }));
        
      } else if (category === 'highest_earning') {
        // Workers with highest earnings with session filter
        const highestEarningQuery = paymentRepo
          .createQueryBuilder("payment")
          .select([
            "worker.id as workerId",
            "worker.name as workerName",
            "SUM(payment.netPay) as totalNetPay",
            "COUNT(payment.id) as paymentCount"
          ])
          .leftJoin("payment.worker", "worker")
          .where("payment.status = :status", { status: 'completed' });
        
        if (currentSession && sessionId) {
          highestEarningQuery.andWhere("payment.session.id = :sessionId", { sessionId });
        }
          
        const highestEarningData = await highestEarningQuery
          .groupBy("worker.id")
          .addGroupBy("worker.name")
          .orderBy("totalNetPay", "DESC")
          .limit(limit)
          .getRawMany();
          
        performers = highestEarningData.map((/** @type {{ workerId: any; workerName: any; totalNetPay: string; paymentCount: string; }} */ item) => ({
          workerId: item.workerId,
          workerName: item.workerName,
          metric: 'Total Earnings',
          value: parseFloat(item.totalNetPay),
          secondaryValue: parseInt(item.paymentCount),
          secondaryLabel: 'Payments Received'
        }));
      }
      
      return {
        status: true,
        message: `Top performers by ${category} retrieved`,
        data: {
          category: category,
          timeFrame: timeFrame,
          performers: performers,
          summary: {
            count: performers.length,
            averageValue: performers.length > 0 
              ? performers.reduce((/** @type {any} */ sum, /** @type {{ value: any; }} */ p) => sum + p.value, 0) / performers.length 
              : 0
          },
          filters: {
            category: category,
            timeFrame: timeFrame,
            limit: limit,
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getTopPerformers error:", error);
      throw error;
    }
  }
  
  /**
   * Get worker attendance
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Worker attendance data
   */
  async getWorkerAttendance(repositories, params) {
    // @ts-ignore
    const { assignment: assignmentRepo } = repositories;
    // @ts-ignore
    const { startDate, endDate, workerId, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      let query = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          "DATE(assignment.assignmentDate) as date",
          "COUNT(assignment.id) as totalAssignments",
          "SUM(CASE WHEN assignment.status = 'completed' THEN 1 ELSE 0 END) as completedAssignments",
          "SUM(CASE WHEN assignment.status = 'active' THEN 1 ELSE 0 END) as activeAssignments"
        ])
        .groupBy("DATE(assignment.assignmentDate)")
        .orderBy("date", "DESC");
      
      if (startDate && endDate) {
        query.where("assignment.assignmentDate BETWEEN :start AND :end", {
          start: new Date(startDate),
          end: new Date(endDate)
        });
      }
      
      if (workerId) {
        query.andWhere("assignment.workerId = :workerId", { workerId });
      }
      
      if (currentSession && sessionId) {
        query.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      const attendanceData = await query.getRawMany();
      
      // Calculate attendance metrics
      const totalDays = attendanceData.length;
      const daysWithAssignments = attendanceData.filter((/** @type {{ totalAssignments: string; }} */ d) => parseInt(d.totalAssignments) > 0).length;
      const completionRate = attendanceData.length > 0 
        ? attendanceData.reduce((/** @type {number} */ sum, /** @type {{ completedAssignments: string; totalAssignments: any; }} */ d) => sum + (parseInt(d.completedAssignments) / parseInt(d.totalAssignments || 1)), 0) / attendanceData.length * 100
        : 0;
      
      return {
        status: true,
        message: "Worker attendance data retrieved",
        data: {
          attendanceRecords: attendanceData.map((/** @type {{ date: any; totalAssignments: string; completedAssignments: string; activeAssignments: string; }} */ item) => ({
            date: item.date,
            totalAssignments: parseInt(item.totalAssignments),
            completedAssignments: parseInt(item.completedAssignments),
            activeAssignments: parseInt(item.activeAssignments),
            completionRate: parseInt(item.totalAssignments) > 0 
              ? (parseInt(item.completedAssignments) / parseInt(item.totalAssignments)) * 100 
              : 0
          })),
          summary: {
            totalDays: totalDays,
            daysWithAssignments: daysWithAssignments,
            attendanceRate: totalDays > 0 ? (daysWithAssignments / totalDays) * 100 : 0,
            averageCompletionRate: completionRate,
            period: {
              start: startDate || (attendanceData.length > 0 ? attendanceData[attendanceData.length - 1]?.date : null),
              end: endDate || (attendanceData.length > 0 ? attendanceData[0]?.date : null)
            }
          },
          filters: {
            startDate: startDate || null,
            endDate: endDate || null,
            workerId: workerId || null,
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getWorkerAttendance error:", error);
      throw error;
    }
  }
  
  /**
   * Get worker details with analytics
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Worker details with analytics
   */
  async getWorkerDetails(repositories, params) {
    // @ts-ignore
    const { workerId, currentSession = false } = params;
    
    if (!workerId) {
      return {
        status: false,
        message: "Worker ID is required",
        data: null
      };
    }
    
    const { 
      // @ts-ignore
      worker: workerRepo, 
      // @ts-ignore
      assignment: assignmentRepo, 
      // @ts-ignore
      debt: debtRepo,
      // @ts-ignore
      payment: paymentRepo,
      // @ts-ignore
      debtHistory: debtHistoryRepo 
    } = repositories;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get worker details
      const worker = await workerRepo.findOne({
        where: { id: workerId },
      });
      
      if (!worker) {
        return {
          status: false,
          message: "Worker not found",
          data: null
        };
      }
      
      // Get worker's assignments with session filter
      let assignmentsQuery = assignmentRepo.find({
        where: { worker: { id: workerId } },
        relations: ['pitak', 'pitak.bukid'],
        order: { assignmentDate: 'DESC' }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        assignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .leftJoin("assignment.pitak", "pitak")
          .leftJoin("pitak.bukid", "bukid")
          .where("assignment.worker.id = :workerId", { workerId })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .orderBy("assignment.assignmentDate", "DESC")
          .getMany();
      }
      
      const assignments = await assignmentsQuery;
      
      // Get worker's debts with session filter
      let debtsQuery = debtRepo.find({
        where: { worker: { id: workerId } },
        order: { dateIncurred: 'DESC' }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        debtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.worker.id = :workerId", { workerId })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .orderBy("debt.dateIncurred", "DESC")
          .getMany();
      }
      
      const debts = await debtsQuery;
      
      // Get worker's payments with session filter
      let paymentsQuery = paymentRepo.find({
        where: { worker: { id: workerId } },
        order: { paymentDate: 'DESC' }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        paymentsQuery = paymentRepo
          .createQueryBuilder("payment")
          .where("payment.worker.id = :workerId", { workerId })
          .andWhere("payment.session.id = :sessionId", { sessionId })
          .orderBy("payment.paymentDate", "DESC")
          .getMany();
      }
      
      const payments = await paymentsQuery;
      
      // Get debt payment history with session filter
      let debtHistoryQuery = debtHistoryRepo.find({
        where: { debt: { worker: { id: workerId } } },
        relations: ['debt'],
        order: { transactionDate: 'DESC' },
        take: 10
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        debtHistoryQuery = debtHistoryRepo
          .createQueryBuilder("history")
          .leftJoin("history.debt", "debt")
          .where("debt.worker.id = :workerId", { workerId })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .orderBy("history.transactionDate", "DESC")
          .take(10)
          .getMany();
      }
      
      const debtHistory = await debtHistoryQuery;
      
      // Calculate statistics
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      // Assignment statistics
      const totalAssignments = assignments.length;
      const completedAssignments = assignments.filter((/** @type {{ status: string; }} */ a) => a.status === 'completed').length;
      const activeAssignments = assignments.filter((/** @type {{ status: string; }} */ a) => a.status === 'active').length;
      const recentAssignments = assignments.filter((/** @type {{ assignmentDate: string | number | Date; }} */ a) => new Date(a.assignmentDate) >= thirtyDaysAgo).length;
      
      const totalLuwang = assignments.reduce((/** @type {number} */ sum, /** @type {{ luwangCount: any; }} */ a) => sum + parseFloat(a.luwangCount || 0), 0);
      const completedLuwang = assignments
        .filter((/** @type {{ status: string; }} */ a) => a.status === 'completed')
        .reduce((/** @type {number} */ sum, /** @type {{ luwangCount: any; }} */ a) => sum + parseFloat(a.luwangCount || 0), 0);
      
      // Debt statistics
      const totalDebts = debts.length;
      const pendingDebts = debts.filter((/** @type {{ status: string; }} */ d) => d.status === 'pending').length;
      const paidDebts = debts.filter((/** @type {{ status: string; }} */ d) => d.status === 'paid').length;
      const overdueDebts = debts.filter((/** @type {{ dueDate: string | number | Date; status: string; }} */ d) => 
        d.dueDate && new Date(d.dueDate) < new Date() && 
        ['pending', 'partially_paid'].includes(d.status)
      ).length;
      
      const totalDebtAmount = debts.reduce((/** @type {number} */ sum, /** @type {{ amount: any; }} */ d) => sum + parseFloat(d.amount || 0), 0);
      const totalDebtBalance = debts.reduce((/** @type {number} */ sum, /** @type {{ balance: any; }} */ d) => sum + parseFloat(d.balance || 0), 0);
      const totalDebtPaid = debts.reduce((/** @type {number} */ sum, /** @type {{ totalPaid: any; }} */ d) => sum + parseFloat(d.totalPaid || 0), 0);
      
      // Payment statistics
      const totalPayments = payments.length;
      const totalPaymentAmount = payments.reduce((/** @type {number} */ sum, /** @type {{ netPay: any; }} */ p) => sum + parseFloat(p.netPay || 0), 0);
      const recentPayments = payments.filter((/** @type {{ paymentDate: string | number | Date; }} */ p) => new Date(p.paymentDate) >= thirtyDaysAgo).length;
      const recentPaymentAmount = payments
        .filter((/** @type {{ paymentDate: string | number | Date; }} */ p) => new Date(p.paymentDate) >= thirtyDaysAgo)
        .reduce((/** @type {number} */ sum, /** @type {{ netPay: any; }} */ p) => sum + parseFloat(p.netPay || 0), 0);
      
      // Calculate performance metrics
      const assignmentCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
      const debtCollectionRate = totalDebtAmount > 0 ? (totalDebtPaid / totalDebtAmount) * 100 : 0;
      const averagePayment = totalPayments > 0 ? totalPaymentAmount / totalPayments : 0;
      const averageLuwang = totalAssignments > 0 ? totalLuwang / totalAssignments : 0;
      
      // Calculate worker score
      const workerScore = this.calculateWorkerScore(
        assignmentCompletionRate,
        debtCollectionRate,
        averageLuwang,
        overdueDebts
      );
      
      // Format recent activity
      const recentActivity = [
        ...assignments.slice(0, 5).map((/** @type {{ id: any; assignmentDate: any; status: any; luwangCount: string; pitak: { location: any; bukid: { name: any; }; }; }} */ a) => ({
          type: 'assignment',
          id: a.id,
          date: a.assignmentDate,
          status: a.status,
          luwangCount: parseFloat(a.luwangCount),
          pitak: a.pitak?.location,
          bukid: a.pitak?.bukid?.name
        })),
        ...payments.slice(0, 5).map((/** @type {{ id: any; paymentDate: any; netPay: string; status: any; paymentMethod: any; }} */ p) => ({
          type: 'payment',
          id: p.id,
          date: p.paymentDate,
          amount: parseFloat(p.netPay),
          status: p.status,
          method: p.paymentMethod
        })),
        ...debtHistory.slice(0, 5).map((/** @type {{ id: any; transactionDate: any; amountPaid: string; transactionType: any; debt: { id: any; }; }} */ h) => ({
          type: 'debt_payment',
          id: h.id,
          date: h.transactionDate,
          amount: parseFloat(h.amountPaid),
          // @ts-ignore
          type: h.transactionType,
          debtId: h.debt?.id
        }))
      // @ts-ignore
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
       .slice(0, 10);
      
      return {
        status: true,
        message: "Worker details retrieved",
        data: {
          worker: {
            id: worker.id,
            name: worker.name,
            contact: worker.contact,
            email: worker.email,
            address: worker.address,
            status: worker.status,
            hireDate: worker.hireDate,
            totalDebt: parseFloat(worker.totalDebt),
            totalPaid: parseFloat(worker.totalPaid),
            currentBalance: parseFloat(worker.currentBalance)
          },
          statistics: {
            assignments: {
              total: totalAssignments,
              completed: completedAssignments,
              active: activeAssignments,
              recent: recentAssignments,
              completionRate: assignmentCompletionRate,
              totalLuwang: totalLuwang,
              completedLuwang: completedLuwang,
              averageLuwang: averageLuwang
            },
            debts: {
              total: totalDebts,
              pending: pendingDebts,
              paid: paidDebts,
              overdue: overdueDebts,
              totalAmount: totalDebtAmount,
              currentBalance: totalDebtBalance,
              totalPaid: totalDebtPaid,
              collectionRate: debtCollectionRate
            },
            payments: {
              total: totalPayments,
              totalAmount: totalPaymentAmount,
              recent: recentPayments,
              recentAmount: recentPaymentAmount,
              average: averagePayment
            }
          },
          performance: {
            score: workerScore,
            category: workerScore >= 80 ? 'Excellent' :
                     workerScore >= 60 ? 'Good' :
                     workerScore >= 40 ? 'Average' : 'Needs Improvement',
            metrics: {
              productivity: assignmentCompletionRate,
              reliability: debtCollectionRate,
              efficiency: averageLuwang
            }
          },
          recentActivity: recentActivity,
          alerts: this.getWorkerAlerts(
            overdueDebts,
            activeAssignments,
            assignmentCompletionRate,
            worker.status
          ),
          summary: {
            lastUpdated: new Date().toISOString(),
            overallStatus: this.getWorkerOverallStatus(
              worker.status,
              overdueDebts,
              activeAssignments,
              assignmentCompletionRate
            )
          },
          filters: {
            workerId: workerId,
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getWorkerDetails error:", error);
      throw error;
    }
  }
  
  // Helper methods
  /**
   * Calculate worker score
   * @param {number} assignmentCompletionRate - Assignment completion rate
   * @param {number} debtCollectionRate - Debt collection rate
   * @param {number} averageLuwang - Average luwang per assignment
   * @param {number} overdueDebts - Number of overdue debts
   * @returns {number} Worker score
   */
  calculateWorkerScore(assignmentCompletionRate, debtCollectionRate, averageLuwang, overdueDebts) {
    let score = 0;
    
    // Assignment completion component (40%)
    score += Math.min(assignmentCompletionRate, 100) * 0.4;
    
    // Debt management component (30%)
    score += Math.min(debtCollectionRate, 100) * 0.3;
    
    // Productivity component (20%)
    const productivityScore = Math.min((averageLuwang / 10) * 100, 100); // Assuming 10 is good average
    score += productivityScore * 0.2;
    
    // Overdue debt penalty (10% - negative impact)
    const overduePenalty = Math.min(overdueDebts * 5, 10); // 5% penalty per overdue debt, max 10%
    score -= overduePenalty * 0.1;
    
    return Math.max(0, Math.min(Math.round(score), 100));
  }
  

  /**
   * @param {number} overdueDebts
   * @param {number} activeAssignments
   * @param {number} completionRate
   * @param {string} workerStatus
   */
  getWorkerAlerts(overdueDebts, activeAssignments, completionRate, workerStatus) {
    const alerts = [];
    
    if (workerStatus !== 'active') {
      alerts.push({
        type: 'status',
        message: `Worker is ${workerStatus}`,
        priority: 'medium'
      });
    }
    
    if (overdueDebts > 0) {
      alerts.push({
        type: 'debt',
        message: `${overdueDebts} overdue debt${overdueDebts > 1 ? 's' : ''}`,
        priority: overdueDebts > 3 ? 'high' : 'medium'
      });
    }
    
    if (activeAssignments > 5) {
      alerts.push({
        type: 'workload',
        message: `High workload: ${activeAssignments} active assignments`,
        priority: 'medium'
      });
    }
    
    if (completionRate < 50) {
      alerts.push({
        type: 'performance',
        message: 'Low assignment completion rate',
        priority: 'low'
      });
    }
    
    return alerts;
  }
  
  /**
   * Get worker overall status
   * @param {string} status - Worker status
   * @param {number} overdueDebts - Number of overdue debts
   * @param {number} activeAssignments - Number of active assignments
   * @param {number} completionRate - Assignment completion rate
   * @returns {string} Overall status
   */
  getWorkerOverallStatus(status, overdueDebts, activeAssignments, completionRate) {
    if (status !== 'active') return 'inactive';
    
    if (overdueDebts > 5) return 'needs_attention';
    if (activeAssignments > 10) return 'busy';
    if (completionRate < 50) return 'needs_improvement';
    if (activeAssignments > 0) return 'active';
    
    return 'available';
  }
}

module.exports = new WorkerAnalytics();