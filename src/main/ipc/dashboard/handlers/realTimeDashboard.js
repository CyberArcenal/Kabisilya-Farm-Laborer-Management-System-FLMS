// dashboard/handlers/realTimeDashboard.js
//@ts-check
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

class RealTimeDashboard {
  /**
   * Get live dashboard data
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Live dashboard data
   */
  async getLiveDashboard(repositories, params) {
    const { 
      // @ts-ignore
      assignment: assignmentRepo, 
      // @ts-ignore
      worker: workerRepo, 
      // @ts-ignore
      debt: debtRepo, 
      // @ts-ignore
      payment: paymentRepo,
      // @ts-ignore
      pitak: pitakRepo 
    } = repositories;
    
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Check for current session filter
      let sessionId = null;
      // @ts-ignore
      if (params.currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get today's assignments with session filter
      let todayAssignmentsQuery = assignmentRepo.count({
        where: {
          assignmentDate: { $gte: todayStart }
        }
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        todayAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :today", { today: todayStart })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const todayAssignments = await todayAssignmentsQuery;
      
      // Get today's completed assignments with session filter
      let todayCompletedQuery = assignmentRepo.count({
        where: {
          assignmentDate: { $gte: todayStart },
          status: 'completed'
        }
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        todayCompletedQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :today", { today: todayStart })
          .andWhere("assignment.status = :status", { status: 'completed' })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const todayCompleted = await todayCompletedQuery;
      
      // Get active workers
      const activeWorkers = await workerRepo.count({
        where: { status: 'active' }
      });
      
      // Get workers with assignments today with session filter
      const workersWithAssignmentsQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select("COUNT(DISTINCT assignment.workerId)", "count")
        .where("assignment.assignmentDate >= :today", { today: todayStart });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        workersWithAssignmentsQuery.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      const workersWithAssignments = await workersWithAssignmentsQuery.getRawOne();
      
      // Get today's payments with session filter
      const todayPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "SUM(payment.netPay) as totalNet",
          "COUNT(payment.id) as paymentCount"
        ])
        .where("payment.paymentDate >= :today", { today: todayStart })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        todayPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const todayPayments = await todayPaymentsQuery.getRawOne();
      
      // Get active debts with session filter
      let activeDebtsQuery = debtRepo.count({
        where: { status: 'pending' }
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        activeDebtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.status = :status", { status: 'pending' })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const activeDebts = await activeDebtsQuery;
      
      // Get total debt balance with session filter
      const totalDebtBalanceQuery = debtRepo
        .createQueryBuilder("debt")
        .select("SUM(debt.balance)", "total")
        .where("debt.status IN (:...statuses)", { 
          statuses: ['pending', 'partially_paid'] 
        });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        totalDebtBalanceQuery.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      const totalDebtBalance = await totalDebtBalanceQuery.getRawOne();
      
      // Get active pitaks
      const activePitaks = await pitakRepo.count({
        where: { status: 'active' }
      });
      
      // Get recent activities (last 2 hours) with session filter
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      let recentAssignmentsQuery = assignmentRepo.find({
        where: {
          createdAt: { $gte: twoHoursAgo }
        },
        relations: ['worker', 'pitak'],
        order: { createdAt: 'DESC' },
        take: 10
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        recentAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .leftJoin("assignment.worker", "worker")
          .leftJoin("assignment.pitak", "pitak")
          .where("assignment.createdAt >= :recent", { recent: twoHoursAgo })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .orderBy("assignment.createdAt", "DESC")
          .take(10)
          .getMany();
      }
      
      const recentAssignments = await recentAssignmentsQuery;
      
      let recentPaymentsQuery = paymentRepo.find({
        where: {
          createdAt: { $gte: twoHoursAgo }
        },
        relations: ['worker'],
        order: { createdAt: 'DESC' },
        take: 10
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        recentPaymentsQuery = paymentRepo
          .createQueryBuilder("payment")
          .leftJoin("payment.worker", "worker")
          .where("payment.createdAt >= :recent", { recent: twoHoursAgo })
          .andWhere("payment.session.id = :sessionId", { sessionId })
          .orderBy("payment.createdAt", "DESC")
          .take(10)
          .getMany();
      }
      
      const recentPayments = await recentPaymentsQuery;
      
      // Calculate assignment completion rate for today
      const todayCompletionRate = todayAssignments > 0 
        ? (todayCompleted / todayAssignments) * 100 
        : 0;
      
      // Calculate worker utilization for today
      const workerUtilization = activeWorkers > 0 
        ? (parseInt(workersWithAssignments?.count) / activeWorkers) * 100 
        : 0;
      
      // Format recent activities
      const recentActivities = [
        // @ts-ignore
        ...recentAssignments.map((assignment) => ({
          type: 'assignment',
          id: assignment.id,
          workerName: assignment.worker?.name || 'Unknown',
          pitakLocation: assignment.pitak?.location || 'Unknown',
          luwangCount: parseFloat(assignment.luwangCount),
          status: assignment.status,
          timestamp: assignment.createdAt,
          action: `Assignment ${assignment.status}`
        })),
        // @ts-ignore
        ...recentPayments.map((payment) => ({
          type: 'payment',
          id: payment.id,
          workerName: payment.worker?.name || 'Unknown',
          netPay: parseFloat(payment.netPay),
          status: payment.status,
          timestamp: payment.createdAt,
          action: `Payment ${payment.status}`
        }))
      ].sort((a, b) => b.timestamp - a.timestamp)
       .slice(0, 15);
      
      // Get system alerts with session filter
      const alerts = await this.getSystemAlerts(repositories, {
        // @ts-ignore
        currentSession: params.currentSession,
        sessionId
      });
      
      // Calculate quick stats
      const averageAssignmentTime = await this.calculateAverageAssignmentTime(assignmentRepo, {
        // @ts-ignore
        currentSession: params.currentSession,
        sessionId
      });
      
      const averagePaymentAmount = parseInt(todayPayments?.paymentCount) > 0 
        ? parseFloat(todayPayments?.totalNet) / parseInt(todayPayments?.paymentCount) 
        : 0;
      
      const debtCollectionRate = await this.calculateDebtCollectionRate(debtRepo, {
        // @ts-ignore
        currentSession: params.currentSession,
        sessionId
      });
      
      return {
        status: true,
        message: "Live dashboard data retrieved",
        data: {
          timestamp: now.toISOString(),
          overview: {
            assignments: {
              today: todayAssignments,
              completed: todayCompleted,
              active: todayAssignments - todayCompleted,
              completionRate: todayCompletionRate
            },
            workers: {
              totalActive: activeWorkers,
              withAssignments: parseInt(workersWithAssignments?.count) || 0,
              utilizationRate: workerUtilization
            },
            financial: {
              todayPayments: parseFloat(todayPayments?.totalNet) || 0,
              todayPaymentCount: parseInt(todayPayments?.paymentCount) || 0,
              activeDebts: activeDebts,
              totalDebtBalance: parseFloat(totalDebtBalance?.total) || 0
            },
            resources: {
              activePitaks: activePitaks
            }
          },
          recentActivities: recentActivities,
          alerts: alerts,
          quickStats: {
            averageAssignmentTime: averageAssignmentTime,
            averagePaymentAmount: averagePaymentAmount,
            debtCollectionRate: debtCollectionRate
          },
          filters: {
            // @ts-ignore
            currentSession: params.currentSession || false
          }
        }
      };
    } catch (error) {
      console.error("getLiveDashboard error:", error);
      throw error;
    }
  }
  
  /**
   * Get today's statistics
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Today's statistics
   */
  async getTodayStats(repositories, params) {
    const { 
      // @ts-ignore
      assignment: assignmentRepo, 
      // @ts-ignore
      payment: paymentRepo,
      // @ts-ignore
      debtHistory: debtHistoryRepo,
      // @ts-ignore
      worker: workerRepo
    } = repositories;
    
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      // Check for current session filter
      let sessionId = null;
      // @ts-ignore
      if (params.currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get assignments comparison with session filter
      let todayAssignmentsQuery = assignmentRepo.count({
        where: { assignmentDate: { $gte: todayStart } }
      });
      
      let yesterdayAssignmentsQuery = assignmentRepo.count({
        where: { 
          assignmentDate: { 
            $gte: yesterdayStart,
            $lt: todayStart
          } 
        }
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        todayAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :today", { today: todayStart })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
        
        // @ts-ignore
        yesterdayAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :yesterday AND assignment.assignmentDate < :today", {
            yesterday: yesterdayStart,
            today: todayStart
          })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const todayAssignments = await todayAssignmentsQuery;
      const yesterdayAssignments = await yesterdayAssignmentsQuery;
      
      const assignmentChange = yesterdayAssignments > 0 
        ? ((todayAssignments - yesterdayAssignments) / yesterdayAssignments) * 100 
        : (todayAssignments > 0 ? 100 : 0);
      
      // Get payments comparison with session filter
      const todayPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select("SUM(payment.netPay)", "total")
        .where("payment.paymentDate >= :today", { today: todayStart })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      const yesterdayPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select("SUM(payment.netPay)", "total")
        .where("payment.paymentDate BETWEEN :start AND :end", {
          start: yesterdayStart,
          end: todayStart
        })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        todayPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
        yesterdayPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const todayPayments = await todayPaymentsQuery.getRawOne();
      const yesterdayPayments = await yesterdayPaymentsQuery.getRawOne();
      
      const todayPaymentTotal = parseFloat(todayPayments?.total) || 0;
      const yesterdayPaymentTotal = parseFloat(yesterdayPayments?.total) || 0;
      
      const paymentChange = yesterdayPaymentTotal > 0 
        ? ((todayPaymentTotal - yesterdayPaymentTotal) / yesterdayPaymentTotal) * 100 
        : (todayPaymentTotal > 0 ? 100 : 0);
      
      // Get debt collections today with session filter
      const todayCollectionsQuery = debtHistoryRepo
        .createQueryBuilder("history")
        .leftJoin("history.debt", "debt")
        .select("SUM(history.amountPaid)", "total")
        .where("history.transactionDate >= :today", { today: todayStart })
        .andWhere("history.transactionType = :type", { type: 'payment' });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        todayCollectionsQuery.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      const todayCollections = await todayCollectionsQuery.getRawOne();
      
      // Get active workers today with session filter
      const workersWithActivityQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select("COUNT(DISTINCT assignment.workerId)", "count")
        .where("assignment.assignmentDate >= :today", { today: todayStart });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        workersWithActivityQuery.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      const workersWithActivity = await workersWithActivityQuery.getRawOne();
      
      // Get completed assignments today with session filter
      let completedTodayQuery = assignmentRepo.count({
        where: {
          assignmentDate: { $gte: todayStart },
          status: 'completed'
        }
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        completedTodayQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :today", { today: todayStart })
          .andWhere("assignment.status = :status", { status: 'completed' })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const completedToday = await completedTodayQuery;
      
      // Get assignment status breakdown for today with session filter
      const statusBreakdownQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .select([
          "assignment.status",
          "COUNT(assignment.id) as count"
        ])
        .where("assignment.assignmentDate >= :today", { today: todayStart });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        statusBreakdownQuery.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      const statusBreakdown = await statusBreakdownQuery
        .groupBy("assignment.status")
        .getRawMany();
      
      // @ts-ignore
      const statusSummary = statusBreakdown.reduce((acc, item) => {
        acc[item.assignment_status] = parseInt(item.count);
        return acc;
      }, { active: 0, completed: 0, cancelled: 0 });
      
      // Calculate hourly distribution for today
      const hourlyData = await this.getHourlyDistribution(assignmentRepo, paymentRepo, todayStart, {
        // @ts-ignore
        currentSession: params.currentSession,
        sessionId
      });
      
      return {
        status: true,
        message: "Today's statistics retrieved",
        data: {
          date: now.toISOString().split('T')[0],
          comparisons: {
            assignments: {
              today: todayAssignments,
              yesterday: yesterdayAssignments,
              change: assignmentChange,
              trend: assignmentChange >= 0 ? 'up' : 'down'
            },
            payments: {
              today: todayPaymentTotal,
              yesterday: yesterdayPaymentTotal,
              change: paymentChange,
              trend: paymentChange >= 0 ? 'up' : 'down'
            }
          },
          todaySummary: {
            assignments: {
              total: todayAssignments,
              completed: completedToday,
              active: statusSummary.active,
              cancelled: statusSummary.cancelled,
              completionRate: todayAssignments > 0 ? (completedToday / todayAssignments) * 100 : 0
            },
            financial: {
              payments: todayPaymentTotal,
              collections: parseFloat(todayCollections?.total) || 0
            },
            workforce: {
              activeWorkers: parseInt(workersWithActivity?.count) || 0,
              productivity: todayAssignments > 0 ? (completedToday / todayAssignments) * 100 : 0
            }
          },
          hourlyDistribution: hourlyData,
          statusBreakdown: statusSummary,
          recommendations: this.getDailyRecommendations(
            todayAssignments, 
            completedToday, 
            todayPaymentTotal
          ),
          filters: {
            // @ts-ignore
            currentSession: params.currentSession || false
          }
        }
      };
    } catch (error) {
      console.error("getTodayStats error:", error);
      throw error;
    }
  }
  
  /**
   * Get real-time assignments
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Real-time assignments data
   */
  async getRealTimeAssignments(repositories, params) {
    // @ts-ignore
    const { assignment: assignmentRepo } = repositories;
    // @ts-ignore
    const { status, limit = 20, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get active assignments (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      let query = assignmentRepo
        .createQueryBuilder("assignment")
        .leftJoin("assignment.worker", "worker")
        .leftJoin("assignment.pitak", "pitak")
        .leftJoin("pitak.bukid", "bukid")
        .select([
          "assignment.id",
          "assignment.luwangCount",
          "assignment.status",
          "assignment.assignmentDate",
          "assignment.createdAt",
          "assignment.updatedAt",
          "worker.name as workerName",
          "worker.id as workerId",
          "pitak.location as pitakLocation",
          "bukid.name as bukidName"
        ])
        .where("assignment.updatedAt >= :recent", { recent: twentyFourHoursAgo });
      
      if (currentSession && sessionId) {
        query.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      if (status) {
        query.andWhere("assignment.status = :status", { status });
      }
      
      if (limit) {
        query.limit(limit);
      }
      
      query.orderBy("assignment.updatedAt", "DESC");
      
      const assignments = await query.getRawMany();
      
      // Calculate time metrics
      // @ts-ignore
      const assignmentsWithMetrics = assignments.map((assignment) => {
        const createdAt = new Date(assignment.assignment_createdAt);
        const updatedAt = new Date(assignment.assignment_updatedAt);
        const now = new Date();
        
        // @ts-ignore
        const ageInHours = Math.floor((now - createdAt) / (1000 * 60 * 60));
        // @ts-ignore
        const lastUpdateInMinutes = Math.floor((now - updatedAt) / (1000 * 60));
        
        let statusColor;
        switch(assignment.assignment_status) {
          case 'completed': statusColor = 'green'; break;
          case 'active': statusColor = 'blue'; break;
          case 'cancelled': statusColor = 'red'; break;
          default: statusColor = 'gray';
        }
        
        return {
          id: assignment.assignment_id,
          workerName: assignment.workerName,
          workerId: assignment.workerId,
          pitakLocation: assignment.pitakLocation,
          bukidName: assignment.bukidName,
          luwangCount: parseFloat(assignment.assignment_luwangCount),
          status: assignment.assignment_status,
          statusColor: statusColor,
          assignmentDate: assignment.assignment_assignmentDate,
          age: {
            hours: ageInHours,
            minutes: lastUpdateInMinutes,
            lastUpdated: assignment.assignment_updatedAt
          },
          progress: assignment.assignment_status === 'completed' ? 100 : 
                   assignment.assignment_status === 'active' ? 50 : 0
        };
      });
      
      // Group by status
      // @ts-ignore
      const byStatus = assignments.reduce((acc, assignment) => {
        const status = assignment.assignment_status;
        if (!acc[status]) {
          acc[status] = 0;
        }
        acc[status]++;
        return acc;
      }, {});
      
      // Group by worker
      // @ts-ignore
      const byWorker = assignments.reduce((acc, assignment) => {
        const workerName = assignment.workerName;
        if (!acc[workerName]) {
          acc[workerName] = { count: 0, totalLuwang: 0 };
        }
        acc[workerName].count++;
        acc[workerName].totalLuwang += parseFloat(assignment.assignment_luwangCount);
        return acc;
      }, {});
      
      // Calculate statistics
      const totalAssignments = assignments.length;
      // @ts-ignore
      const activeAssignments = assignments.filter(a => a.assignment_status === 'active').length;
      // @ts-ignore
      const completedAssignments = assignments.filter(a => a.assignment_status === 'completed').length;
      
      // @ts-ignore
      const totalLuwang = assignments.reduce((sum, a) => 
        sum + parseFloat(a.assignment_luwangCount), 0);
      
      const averageLuwang = totalAssignments > 0 ? totalLuwang / totalAssignments : 0;
      
      // Get workers with most assignments
      const topWorkers = Object.entries(byWorker)
        .map(([workerName, data]) => ({
          workerName,
          assignmentCount: data.count,
          totalLuwang: data.totalLuwang
        }))
        .sort((a, b) => b.assignmentCount - a.assignmentCount)
        .slice(0, 5);
      
      return {
        status: true,
        message: "Real-time assignments retrieved",
        data: {
          assignments: assignmentsWithMetrics,
          summary: {
            total: totalAssignments,
            active: activeAssignments,
            completed: completedAssignments,
            totalLuwang: totalLuwang,
            averageLuwang: averageLuwang,
            completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
          },
          distribution: {
            byStatus: Object.keys(byStatus).map(status => ({
              status: status,
              count: byStatus[status],
              percentage: (byStatus[status] / totalAssignments) * 100
            })),
            byWorker: Object.keys(byWorker).map(workerName => ({
              workerName: workerName,
              count: byWorker[workerName].count,
              totalLuwang: byWorker[workerName].totalLuwang
            }))
          },
          topWorkers: topWorkers,
          filters: {
            status: status,
            limit: limit,
            currentSession: currentSession
          },
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("getRealTimeAssignments error:", error);
      throw error;
    }
  }
  
  /**
   * Get recent payments
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Recent payments data
   */
  async getRecentPayments(repositories, params) {
    // @ts-ignore
    const { payment: paymentRepo, debtHistory: debtHistoryRepo } = repositories;
    // @ts-ignore
    const { limit = 20, includeDebtPayments = true, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get recent payments with session filter
      let paymentsQuery = paymentRepo.find({
        relations: ['worker'],
        order: { paymentDate: 'DESC' },
        take: limit
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        paymentsQuery = paymentRepo
          .createQueryBuilder("payment")
          .leftJoin("payment.worker", "worker")
          .where("payment.session.id = :sessionId", { sessionId })
          .orderBy("payment.paymentDate", "DESC")
          .take(limit)
          .getMany();
      }
      
      const payments = await paymentsQuery;
      
      // Get recent debt payments if requested
      let debtPayments = [];
      if (includeDebtPayments) {
        let debtPaymentsQuery = debtHistoryRepo.find({
          where: { transactionType: 'payment' },
          relations: ['debt', 'debt.worker'],
          order: { transactionDate: 'DESC' },
          take: limit
        });
        
        if (currentSession && sessionId) {
          // @ts-ignore
          debtPaymentsQuery = debtHistoryRepo
            .createQueryBuilder("history")
            .leftJoin("history.debt", "debt")
            .leftJoin("debt.worker", "worker")
            .where("history.transactionType = :type", { type: 'payment' })
            .andWhere("debt.session.id = :sessionId", { sessionId })
            .orderBy("history.transactionDate", "DESC")
            .take(limit)
            .getMany();
        }
        
        debtPayments = await debtPaymentsQuery;
      }
      
      // Format payment data
      // @ts-ignore
      const formattedPayments = payments.map((payment) => ({
        type: 'salary',
        id: payment.id,
        workerName: payment.worker?.name || 'Unknown',
        workerId: payment.worker?.id,
        amount: parseFloat(payment.netPay),
        grossAmount: parseFloat(payment.grossPay),
        deductions: parseFloat(payment.totalDebtDeduction) + parseFloat(payment.otherDeductions || 0),
        status: payment.status,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber
      }));
      
      // Format debt payment data
      // @ts-ignore
      const formattedDebtPayments = debtPayments.map((payment) => ({
        type: 'debt',
        id: payment.id,
        workerName: payment.debt?.worker?.name || 'Unknown',
        workerId: payment.debt?.worker?.id,
        amount: parseFloat(payment.amountPaid),
        previousBalance: parseFloat(payment.previousBalance),
        newBalance: parseFloat(payment.newBalance),
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        transactionDate: payment.transactionDate,
        debtId: payment.debt?.id
      }));
      
      // Combine and sort by date
      const allPayments = [...formattedPayments, ...formattedDebtPayments]
        .sort((a, b) => {
          const dateA = a.type === 'salary' ? a.paymentDate : a.transactionDate;
          const dateB = b.type === 'salary' ? b.paymentDate : b.transactionDate;
          // @ts-ignore
          return new Date(dateB) - new Date(dateA);
        })
        .slice(0, limit);
      
      // Calculate summary statistics
      const totalSalaryPayments = formattedPayments.length;
      const totalDebtPayments = formattedDebtPayments.length;
      
      // @ts-ignore
      const totalSalaryAmount = formattedPayments.reduce((sum, p) => sum + p.amount, 0);
      // @ts-ignore
      const totalDebtAmount = formattedDebtPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalAmount = totalSalaryAmount + totalDebtAmount;
      
      // Group by payment method
      const byMethod = allPayments.reduce((acc, payment) => {
        const method = payment.paymentMethod || 'Unknown';
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count++;
        acc[method].amount += payment.amount;
        return acc;
      }, {});
      
      // Group by worker
      const byWorker = allPayments.reduce((acc, payment) => {
        const workerName = payment.workerName;
        if (!acc[workerName]) {
          acc[workerName] = { count: 0, amount: 0 };
        }
        acc[workerName].count++;
        acc[workerName].amount += payment.amount;
        return acc;
      }, {});
      
      // Get top payees
      const topPayees = Object.entries(byWorker)
        .map(([workerName, data]) => ({
          workerName,
          paymentCount: data.count,
          totalAmount: data.amount
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);
      
      // Calculate average payment
      const averagePayment = allPayments.length > 0 
        ? totalAmount / allPayments.length 
        : 0;
      
      return {
        status: true,
        message: "Recent payments retrieved",
        data: {
          payments: allPayments,
          summary: {
            totalPayments: allPayments.length,
            salaryPayments: totalSalaryPayments,
            debtPayments: totalDebtPayments,
            totalAmount: totalAmount,
            salaryAmount: totalSalaryAmount,
            debtAmount: totalDebtAmount,
            averagePayment: averagePayment
          },
          distribution: {
            byType: {
              salary: {
                count: totalSalaryPayments,
                amount: totalSalaryAmount,
                percentage: totalAmount > 0 ? (totalSalaryAmount / totalAmount) * 100 : 0
              },
              debt: {
                count: totalDebtPayments,
                amount: totalDebtAmount,
                percentage: totalAmount > 0 ? (totalDebtAmount / totalAmount) * 100 : 0
              }
            },
            byMethod: Object.keys(byMethod).map(method => ({
              method: method,
              count: byMethod[method].count,
              amount: byMethod[method].amount,
              percentage: totalAmount > 0 ? (byMethod[method].amount / totalAmount) * 100 : 0
            })),
            byWorker: Object.keys(byWorker).map(workerName => ({
              workerName: workerName,
              count: byWorker[workerName].count,
              amount: byWorker[workerName].amount
            }))
          },
          topPayees: topPayees,
          filters: {
            limit: limit,
            includeDebtPayments: includeDebtPayments,
            currentSession: currentSession
          },
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("getRecentPayments error:", error);
      throw error;
    }
  }
  
  /**
   * Get pending debts
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Pending debts data
   */
  async getPendingDebts(repositories, params) {
    // @ts-ignore
    const { debt: debtRepo } = repositories;
    // @ts-ignore
    const { status = 'pending', limit = 20, overdueOnly = false, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Build query for pending debts
      let query = debtRepo
        .createQueryBuilder("debt")
        .leftJoin("debt.worker", "worker")
        .select([
          "debt.id",
          "debt.originalAmount",
          "debt.amount",
          "debt.balance",
          "debt.status",
          "debt.dateIncurred",
          "debt.dueDate",
          "debt.interestRate",
          "debt.totalPaid",
          "debt.lastPaymentDate",
          "worker.name as workerName",
          "worker.id as workerId",
          "worker.contact as workerContact"
        ])
        .orderBy("debt.dueDate", "ASC");
      
      // Apply filters
      if (status) {
        query.where("debt.status = :status", { status });
      }
      
      if (overdueOnly) {
        query.andWhere("debt.dueDate IS NOT NULL")
          .andWhere("debt.dueDate < :today", { today: new Date() });
      }
      
      if (currentSession && sessionId) {
        query.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      if (limit) {
        query.limit(limit);
      }
      
      const debts = await query.getRawMany();
      
      // Calculate additional metrics
      // @ts-ignore
      const debtsWithMetrics = debts.map((debt) => {
        const dueDate = debt.debt_dueDate ? new Date(debt.debt_dueDate) : null;
        const today = new Date();
        let overdueDays = 0;
        let isOverdue = false;
        
        if (dueDate && dueDate < today) {
          // @ts-ignore
          overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
          isOverdue = true;
        }
        
        const amount = parseFloat(debt.debt_amount) || 0;
        const balance = parseFloat(debt.debt_balance) || 0;
        const paid = parseFloat(debt.debt_totalPaid) || 0;
        const paymentRate = amount > 0 ? (paid / amount) * 100 : 0;
        
        // Calculate urgency level
        let urgency = 'low';
        if (isOverdue) {
          if (overdueDays > 30) urgency = 'critical';
          else if (overdueDays > 15) urgency = 'high';
          else urgency = 'medium';
        } else if (dueDate) {
          // @ts-ignore
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 7) urgency = 'medium';
        }
        
        return {
          id: debt.debt_id,
          workerName: debt.workerName,
          workerId: debt.workerId,
          workerContact: debt.workerContact,
          originalAmount: parseFloat(debt.debt_originalAmount) || 0,
          amount: amount,
          balance: balance,
          paid: paid,
          paymentRate: paymentRate,
          status: debt.debt_status,
          dateIncurred: debt.debt_dateIncurred,
          dueDate: debt.debt_dueDate,
          interestRate: parseFloat(debt.debt_interestRate) || 0,
          lastPaymentDate: debt.debt_lastPaymentDate,
          overdue: {
            isOverdue: isOverdue,
            days: overdueDays
          },
          urgency: urgency,
          // @ts-ignore
          ageInDays: Math.ceil((today - new Date(debt.debt_dateIncurred)) / (1000 * 60 * 60 * 24))
        };
      });
      
      // Sort by urgency (critical first)
      // @ts-ignore
      debtsWithMetrics.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        // @ts-ignore
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
      
      // Calculate summary statistics
      const totalDebts = debtsWithMetrics.length;
      // @ts-ignore
      const totalAmount = debtsWithMetrics.reduce((sum, debt) => sum + debt.amount, 0);
      // @ts-ignore
      const totalBalance = debtsWithMetrics.reduce((sum, debt) => sum + debt.balance, 0);
      // @ts-ignore
      const totalPaid = debtsWithMetrics.reduce((sum, debt) => sum + debt.paid, 0);
      
      // @ts-ignore
      const overdueDebts = debtsWithMetrics.filter(d => d.overdue.isOverdue);
      // @ts-ignore
      const totalOverdueAmount = overdueDebts.reduce((sum, debt) => sum + debt.balance, 0);
      
      const averageDebt = totalDebts > 0 ? totalAmount / totalDebts : 0;
      const averageBalance = totalDebts > 0 ? totalBalance / totalDebts : 0;
      const averageAge = totalDebts > 0 
        // @ts-ignore
        ? debtsWithMetrics.reduce((sum, debt) => sum + debt.ageInDays, 0) / totalDebts 
        : 0;
      
      // Group by worker
      // @ts-ignore
      const byWorker = debtsWithMetrics.reduce((acc, debt) => {
        const workerName = debt.workerName;
        if (!acc[workerName]) {
          acc[workerName] = { count: 0, totalBalance: 0, debts: [] };
        }
        acc[workerName].count++;
        acc[workerName].totalBalance += debt.balance;
        acc[workerName].debts.push(debt.id);
        return acc;
      }, {});
      
      // Get workers with highest debt
      const topDebtors = Object.entries(byWorker)
        .map(([workerName, data]) => ({
          workerName,
          debtCount: data.count,
          totalBalance: data.totalBalance
        }))
        .sort((a, b) => b.totalBalance - a.totalBalance)
        .slice(0, 5);
      
      // Group by urgency
      // @ts-ignore
      const byUrgency = debtsWithMetrics.reduce((acc, debt) => {
        if (!acc[debt.urgency]) {
          acc[debt.urgency] = 0;
        }
        acc[debt.urgency]++;
        return acc;
      }, {});
      
      return {
        status: true,
        message: "Pending debts retrieved",
        data: {
          debts: debtsWithMetrics,
          summary: {
            totalDebts: totalDebts,
            totalAmount: totalAmount,
            totalBalance: totalBalance,
            totalPaid: totalPaid,
            collectionRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
            overdueDebts: overdueDebts.length,
            totalOverdueAmount: totalOverdueAmount,
            averageDebt: averageDebt,
            averageBalance: averageBalance,
            averageAge: averageAge
          },
          distribution: {
            byUrgency: Object.keys(byUrgency).map(urgency => ({
              urgency: urgency,
              count: byUrgency[urgency],
              percentage: (byUrgency[urgency] / totalDebts) * 100
            })),
            byWorker: Object.keys(byWorker).map(workerName => ({
              workerName: workerName,
              count: byWorker[workerName].count,
              totalBalance: byWorker[workerName].totalBalance
            }))
          },
          topDebtors: topDebtors,
          filters: {
            status: status,
            overdueOnly: overdueOnly,
            limit: limit,
            currentSession: currentSession
          },
          recommendations: overdueDebts.length > 0 ? [
            "Follow up on overdue debts immediately",
            "Consider payment plans for large balances",
            "Review debt collection procedures"
          ] : [
            "Debt collection is on track",
            "Continue monitoring upcoming due dates",
            "Maintain current collection practices"
          ],
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("getPendingDebts error:", error);
      throw error;
    }
  }
  
  // Helper methods

  // @ts-ignore
  async getSystemAlerts(repositories, params) {
    const { debt: debtRepo, assignment: assignmentRepo } = repositories;
    const { currentSession = false, sessionId = null } = params;
    
    const alerts = [];
    
    try {
      // Check for overdue debts with session filter
      let overdueDebtsQuery = debtRepo.count({
        where: {
          dueDate: { $lt: new Date() },
          status: { $in: ['pending', 'partially_paid'] }
        }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        overdueDebtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.dueDate < :today", { today: new Date() })
          .andWhere("debt.status IN (:...statuses)", { statuses: ['pending', 'partially_paid'] })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const overdueDebts = await overdueDebtsQuery;
      
      if (overdueDebts > 0) {
        alerts.push({
          type: 'warning',
          title: 'Overdue Debts',
          message: `${overdueDebts} debts are overdue`,
          priority: 'high',
          timestamp: new Date()
        });
      }
      
      // Check for assignments without updates in 3 days with session filter
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      let staleAssignmentsQuery = assignmentRepo.count({
        where: {
          status: 'active',
          updatedAt: { $lt: threeDaysAgo }
        }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        staleAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.status = :status", { status: 'active' })
          .andWhere("assignment.updatedAt < :threeDaysAgo", { threeDaysAgo })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const staleAssignments = await staleAssignmentsQuery;
      
      if (staleAssignments > 0) {
        alerts.push({
          type: 'info',
          title: 'Stale Assignments',
          message: `${staleAssignments} assignments haven't been updated in 3+ days`,
          priority: 'medium',
          timestamp: new Date()
        });
      }
      
      // Check for high debt workers with session filter
      const highDebtWorkersQuery = debtRepo
        .createQueryBuilder("debt")
        .leftJoin("debt.worker", "worker")
        .select([
          "worker.name",
          "SUM(debt.balance) as totalDebt"
        ])
        .where("debt.status IN (:...statuses)", { 
          statuses: ['pending', 'partially_paid'] 
        });
      
      if (currentSession && sessionId) {
        highDebtWorkersQuery.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      const highDebtWorkers = await highDebtWorkersQuery
        .groupBy("worker.name")
        .having("SUM(debt.balance) > 10000") // Threshold for high debt
        .getRawMany();
      
      if (highDebtWorkers.length > 0) {
        alerts.push({
          type: 'warning',
          title: 'High Debt Workers',
          message: `${highDebtWorkers.length} workers have debt over 10,000`,
          priority: 'medium',
          // @ts-ignore
          details: highDebtWorkers.map(w => w.worker_name),
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error("getSystemAlerts error:", error);
    }
    
    return alerts;
  }
  
  /**
   * Calculate average assignment time
   * @param {Object} assignmentRepo - Assignment repository
   * @param {Object} params - Query parameters
   * @returns {Promise<number>} Average assignment time in hours
   */
  async calculateAverageAssignmentTime(assignmentRepo, params) {
    // @ts-ignore
    const { currentSession = false, sessionId = null } = params;
    
    try {
      // @ts-ignore
      let completedAssignmentsQuery = assignmentRepo.find({
        where: { status: 'completed' },
        select: ['createdAt', 'updatedAt']
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        completedAssignmentsQuery = assignmentRepo
          // @ts-ignore
          .createQueryBuilder("assignment")
          .select(["assignment.createdAt", "assignment.updatedAt"])
          .where("assignment.status = :status", { status: 'completed' })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getMany();
      }
      
      const completedAssignments = await completedAssignmentsQuery;
      
      if (completedAssignments.length === 0) return 0;
      
      // @ts-ignore
      const totalTime = completedAssignments.reduce((sum, assignment) => {
        const start = new Date(assignment.createdAt);
        const end = new Date(assignment.updatedAt);
        // @ts-ignore
        return sum + (end - start);
      }, 0);
      
      return totalTime / completedAssignments.length / (1000 * 60 * 60); // Return in hours
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Calculate debt collection rate
   * @param {Object} debtRepo - Debt repository
   * @param {Object} params - Query parameters
   * @returns {Promise<number>} Debt collection rate percentage
   */
  async calculateDebtCollectionRate(debtRepo, params) {
    // @ts-ignore
    const { currentSession = false, sessionId = null } = params;
    
    try {
      const debtStatsQuery = debtRepo
        // @ts-ignore
        .createQueryBuilder("debt")
        .select([
          "SUM(debt.amount) as totalAmount",
          "SUM(debt.totalPaid) as totalPaid"
        ]);
      
      if (currentSession && sessionId) {
        debtStatsQuery.where("debt.session.id = :sessionId", { sessionId });
      }
      
      const debtStats = await debtStatsQuery.getRawOne();
      
      const totalAmount = parseFloat(debtStats?.totalAmount) || 0;
      const totalPaid = parseFloat(debtStats?.totalPaid) || 0;
      
      return totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get hourly distribution
   * @param {Object} assignmentRepo - Assignment repository
   * @param {Object} paymentRepo - Payment repository
   * @param {Date} startDate - Start date
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Hourly distribution data
   */
  async getHourlyDistribution(assignmentRepo, paymentRepo, startDate, params) {
    // @ts-ignore
    const { currentSession = false, sessionId = null } = params;
    
    try {
      const hourlyAssignments = [];
      const hourlyPayments = [];
      
      // Get hourly assignments
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        // @ts-ignore
        let assignmentsQuery = assignmentRepo.count({
          where: {
            assignmentDate: { $gte: hourStart, $lt: hourEnd }
          }
        });
        
        if (currentSession && sessionId) {
          // @ts-ignore
          assignmentsQuery = assignmentRepo
            // @ts-ignore
            .createQueryBuilder("assignment")
            .where("assignment.assignmentDate >= :hourStart AND assignment.assignmentDate < :hourEnd", {
              hourStart,
              hourEnd
            })
            .andWhere("assignment.session.id = :sessionId", { sessionId })
            .getCount();
        }
        
        const assignments = await assignmentsQuery;
        
        hourlyAssignments.push({
          hour: hour,
          assignments: assignments
        });
      }
      
      // Get hourly payments
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        const paymentsQuery = paymentRepo
          // @ts-ignore
          .createQueryBuilder("payment")
          .select("SUM(payment.netPay)", "total")
          .where("payment.paymentDate >= :start AND payment.paymentDate < :end", {
            start: hourStart,
            end: hourEnd
          })
          .andWhere("payment.status = :status", { status: 'completed' });
        
        if (currentSession && sessionId) {
          paymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
        }
        
        const payments = await paymentsQuery.getRawOne();
        
        hourlyPayments.push({
          hour: hour,
          amount: parseFloat(payments?.total) || 0
        });
      }
      
      return {
        assignments: hourlyAssignments,
        payments: hourlyPayments
      };
    } catch (error) {
      return { assignments: [], payments: [] };
    }
  }
  

  // @ts-ignore
  getDailyRecommendations(assignments, completed, payments) {
    const recommendations = [];
    
    if (assignments === 0) {
      recommendations.push("No assignments today. Consider scheduling new assignments.");
    }
    
    if (assignments > 0 && completed / assignments < 0.5) {
      recommendations.push("Low completion rate today. Check on active assignments.");
    }
    
    if (payments === 0) {
      recommendations.push("No payments processed today. Review payment schedule.");
    }
    
    if (assignments > 20 && completed < 10) {
      recommendations.push("High volume of incomplete assignments. Consider reassigning or providing support.");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Good progress today. Keep up the good work!");
    }
    
    return recommendations;
  }
}

module.exports = new RealTimeDashboard();