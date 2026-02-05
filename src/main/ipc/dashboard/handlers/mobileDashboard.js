// dashboard/handlers/mobileDashboard.js
//@ts-check
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

class MobileDashboard {
  /**
   * Get mobile-optimized dashboard data
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Mobile dashboard data
   */
  async getMobileDashboard(repositories, params) {
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
      
      // Get key metrics for mobile display
      const activeWorkers = await workerRepo.count({ where: { status: 'active' } });
      
      // Get today's assignments with session filter
      let todayAssignmentsQuery = assignmentRepo.count({ 
        where: { assignmentDate: { $gte: todayStart } } 
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
      
      const activeAssignments = await assignmentRepo.count({ where: { status: 'active' } });
      const activePitaks = await pitakRepo.count({ where: { status: 'active' } });
      
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
      
      // Get today's payments with session filter
      const todayPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select("SUM(payment.netPay)", "total")
        .where("payment.paymentDate >= :today", { today: todayStart })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        todayPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const todayPayments = await todayPaymentsQuery.getRawOne();
      
      // Get pending debts with session filter
      let pendingDebtsQuery = debtRepo.count({ 
        where: { status: 'pending' } 
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        pendingDebtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.status = :status", { status: 'pending' })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const pendingDebts = await pendingDebtsQuery;
      
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
      
      // Get recent activities (last 3 hours) with session filter
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      
      let recentActivitiesQuery = assignmentRepo.find({
        where: {
          updatedAt: { $gte: threeHoursAgo }
        },
        relations: ['worker'],
        order: { updatedAt: 'DESC' },
        take: 5
      });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        recentActivitiesQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .leftJoin("assignment.worker", "worker")
          .where("assignment.updatedAt >= :recent", { recent: threeHoursAgo })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .orderBy("assignment.updatedAt", "DESC")
          .take(5)
          .getMany();
      }
      
      const recentActivities = await recentActivitiesQuery;
      
      // Format activities for mobile
      // @ts-ignore
      const formattedActivities = recentActivities.map((activity) => ({
        id: activity.id,
        type: 'assignment',
        workerName: activity.worker?.name || 'Unknown',
        action: activity.status === 'completed' ? 'completed assignment' : 
                activity.status === 'active' ? 'started assignment' : 
                'updated assignment',
        luwangCount: parseFloat(activity.luwangCount),
        status: activity.status,
        time: this.formatTimeAgo(activity.updatedAt)
      }));
      
      // Get workers with upcoming assignments today with session filter
      const workersWithTodayAssignmentsQuery = assignmentRepo
        .createQueryBuilder("assignment")
        .leftJoin("assignment.worker", "worker")
        .select([
          "worker.name as workerName",
          "COUNT(assignment.id) as assignmentCount",
          "SUM(assignment.luwangCount) as totalLuwang"
        ])
        .where("assignment.assignmentDate >= :today", { today: todayStart });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        workersWithTodayAssignmentsQuery.andWhere("assignment.session.id = :sessionId", { sessionId });
      }
      
      const workersWithTodayAssignments = await workersWithTodayAssignmentsQuery
        .groupBy("worker.name")
        .orderBy("assignmentCount", "DESC")
        .limit(5)
        .getRawMany();
      
      // Calculate quick stats
      const completionRate = todayAssignments > 0 
        ? (todayCompleted / todayAssignments) * 100 
        : 0;
      
      const averagePayment = parseInt(todayPayments?.paymentCount) > 0 
        ? parseFloat(todayPayments?.total) / parseInt(todayPayments?.paymentCount) 
        : 0;
      
      // Get mobile alerts with session filter
      const alerts = await this.getMobileAlerts(repositories, {
        // @ts-ignore
        currentSession: params.currentSession,
        sessionId
      });
      
      // Prepare mobile-optimized response
      return {
        status: true,
        message: "Mobile dashboard data retrieved",
        data: {
          timestamp: now.toISOString(),
          overviewCards: [
            {
              title: "Active Workers",
              value: activeWorkers,
              icon: "workers",
              color: "blue",
              trend: null
            },
            {
              title: "Today's Assignments",
              value: todayAssignments,
              icon: "assignments",
              color: "green",
              subValue: `${todayCompleted} completed`,
              trend: completionRate >= 70 ? 'good' : completionRate >= 40 ? 'average' : 'poor'
            },
            {
              title: "Active Pitaks",
              value: activePitaks,
              icon: "pitaks",
              color: "orange",
              trend: null
            },
            {
              title: "Today's Payments",
              value: parseFloat(todayPayments?.total) || 0,
              icon: "payments",
              color: "purple",
              format: "currency",
              trend: null
            }
          ],
          quickStats: {
            completionRate: completionRate,
            activeAssignments: activeAssignments,
            pendingDebts: pendingDebts,
            totalDebtBalance: parseFloat(totalDebtBalance?.total) || 0,
            averagePayment: averagePayment
          },
          recentActivities: formattedActivities,
          // @ts-ignore
          todaysTopWorkers: workersWithTodayAssignments.map((worker) => ({
            workerName: worker.workerName,
            assignmentCount: parseInt(worker.assignmentCount),
            totalLuwang: parseFloat(worker.totalLuwang)
          })),
          alerts: alerts,
          lastUpdated: this.formatTimeAgo(now),
          filters: {
            // @ts-ignore
            currentSession: params.currentSession || false
          }
        }
      };
    } catch (error) {
      console.error("getMobileDashboard error:", error);
      throw error;
    }
  }
  
  /**
   * Get quick statistics for mobile dashboard
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Quick statistics
   */
  async getQuickStats(repositories, params) {
    // @ts-ignore
    const { worker: workerRepo, assignment: assignmentRepo, debt: debtRepo } = repositories;
    
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      
      // Check for current session filter
      let sessionId = null;
      // @ts-ignore
      if (params.currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get worker statistics
      const totalWorkers = await workerRepo.count();
      const activeWorkers = await workerRepo.count({ where: { status: 'active' } });
      const inactiveWorkers = await workerRepo.count({ where: { status: 'inactive' } });
      
      // Get assignment statistics with session filter
      let todayAssignmentsQuery = assignmentRepo.count({ 
        where: { assignmentDate: { $gte: todayStart } } 
      });
      
      let weekAssignmentsQuery = assignmentRepo.count({ 
        where: { assignmentDate: { $gte: weekStart } } 
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
        weekAssignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :weekStart", { weekStart })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const todayAssignments = await todayAssignmentsQuery;
      const weekAssignments = await weekAssignmentsQuery;
      
      const activeAssignments = await assignmentRepo.count({ where: { status: 'active' } });
      const completedAssignments = await assignmentRepo.count({ where: { status: 'completed' } });
      
      // Get debt statistics with session filter
      let totalDebtsQuery = debtRepo.count();
      let pendingDebtsQuery = debtRepo.count({ where: { status: 'pending' } });
      let paidDebtsQuery = debtRepo.count({ where: { status: 'paid' } });
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        // @ts-ignore
        totalDebtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.session.id = :sessionId", { sessionId })
          .getCount();
        
        // @ts-ignore
        pendingDebtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.status = :status", { status: 'pending' })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .getCount();
        
        // @ts-ignore
        paidDebtsQuery = debtRepo
          .createQueryBuilder("debt")
          .where("debt.status = :status", { status: 'paid' })
          .andWhere("debt.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const totalDebts = await totalDebtsQuery;
      const pendingDebts = await pendingDebtsQuery;
      const paidDebts = await paidDebtsQuery;
      
      const debtStatsQuery = debtRepo
        .createQueryBuilder("debt")
        .select([
          "SUM(debt.amount) as totalAmount",
          "SUM(debt.balance) as totalBalance",
          "SUM(debt.totalPaid) as totalPaid"
        ]);
      
      // @ts-ignore
      if (params.currentSession && sessionId) {
        debtStatsQuery.where("debt.session.id = :sessionId", { sessionId });
      }
      
      const debtStats = await debtStatsQuery.getRawOne();
      
      // Get today's completion rate
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
      
      const todayCompletionRate = todayAssignments > 0 
        ? (todayCompleted / todayAssignments) * 100 
        : 0;
      
      // Calculate worker debt averages
      const averageDebtPerWorker = activeWorkers > 0 
        ? parseFloat(debtStats?.totalBalance) / activeWorkers 
        : 0;
      
      // Get assignment completion rate
      const overallCompletionRate = (todayAssignments + weekAssignments) > 0 
        ? (completedAssignments / (todayAssignments + weekAssignments)) * 100 
        : 0;
      
      return {
        status: true,
        message: "Quick stats retrieved",
        data: {
          timestamp: now.toISOString(),
          workers: {
            total: totalWorkers,
            active: activeWorkers,
            inactive: inactiveWorkers,
            activePercentage: totalWorkers > 0 ? (activeWorkers / totalWorkers) * 100 : 0
          },
          assignments: {
            today: todayAssignments,
            week: weekAssignments,
            active: activeAssignments,
            completed: completedAssignments,
            todayCompletionRate: todayCompletionRate,
            overallCompletionRate: overallCompletionRate
          },
          debts: {
            total: totalDebts,
            pending: pendingDebts,
            paid: paidDebts,
            totalAmount: parseFloat(debtStats?.totalAmount) || 0,
            totalBalance: parseFloat(debtStats?.totalBalance) || 0,
            totalPaid: parseFloat(debtStats?.totalPaid) || 0,
            collectionRate: parseFloat(debtStats?.totalAmount) > 0 
              ? (parseFloat(debtStats?.totalPaid) / parseFloat(debtStats?.totalAmount)) * 100 
              : 0,
            averagePerWorker: averageDebtPerWorker
          },
          performance: {
            workerUtilization: activeWorkers > 0 ? (todayAssignments / activeWorkers) * 100 : 0,
            debtHealth: parseFloat(debtStats?.totalBalance) < parseFloat(debtStats?.totalAmount) * 0.3 
              ? 'good' 
              : parseFloat(debtStats?.totalBalance) < parseFloat(debtStats?.totalAmount) * 0.6 
                ? 'fair' 
                : 'poor'
          },
          summary: {
            overallHealth: this.calculateOverallHealth(
              todayCompletionRate, 
              parseFloat(debtStats?.totalBalance),
              parseFloat(debtStats?.totalAmount)
            ),
            priorityActions: this.getPriorityActions(
              pendingDebts, 
              activeAssignments, 
              todayCompletionRate
            )
          },
          filters: {
            // @ts-ignore
            currentSession: params.currentSession || false
          }
        }
      };
    } catch (error) {
      console.error("getQuickStats error:", error);
      throw error;
    }
  }
  
  /**
   * Get quick view for a specific worker
   * @param {Object} repositories - Repository objects
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Worker quick view data
   */
  async getWorkerQuickView(repositories, params) {
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
      payment: paymentRepo 
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
      
      const now = new Date();
      // @ts-ignore
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 30); // Last 30 days
      
      // Get worker's assignments with session filter
      let assignmentsQuery = assignmentRepo.find({
        where: { worker: { id: workerId } },
        order: { assignmentDate: 'DESC' },
        take: 10
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        assignmentsQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.worker.id = :workerId", { workerId })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .orderBy("assignment.assignmentDate", "DESC")
          .take(10)
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
        order: { paymentDate: 'DESC' },
        take: 10
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        paymentsQuery = paymentRepo
          .createQueryBuilder("payment")
          .where("payment.worker.id = :workerId", { workerId })
          .andWhere("payment.session.id = :sessionId", { sessionId })
          .orderBy("payment.paymentDate", "DESC")
          .take(10)
          .getMany();
      }
      
      const payments = await paymentsQuery;
      
      // Calculate assignment statistics
      const totalAssignments = assignments.length;
      // @ts-ignore
      const completedAssignments = assignments.filter(a => a.status === 'completed').length;
      // @ts-ignore
      const activeAssignments = assignments.filter(a => a.status === 'active').length;
      
      // @ts-ignore
      const totalLuwang = assignments.reduce((sum, a) => 
        sum + parseFloat(a.luwangCount || 0), 0);
      
      const completedLuwang = assignments
        // @ts-ignore
        .filter(a => a.status === 'completed')
        // @ts-ignore
        .reduce((sum, a) => sum + parseFloat(a.luwangCount || 0), 0);
      
      // Calculate debt statistics
      const totalDebts = debts.length;
      // @ts-ignore
      const pendingDebts = debts.filter(d => d.status === 'pending').length;
      // @ts-ignore
      const paidDebts = debts.filter(d => d.status === 'paid').length;
      
      // @ts-ignore
      const totalDebtAmount = debts.reduce((sum, d) => 
        sum + parseFloat(d.amount || 0), 0);
      
      // @ts-ignore
      const totalDebtBalance = debts.reduce((sum, d) => 
        sum + parseFloat(d.balance || 0), 0);
      
      // @ts-ignore
      const totalDebtPaid = debts.reduce((sum, d) => 
        sum + parseFloat(d.totalPaid || 0), 0);
      
      // Calculate payment statistics
      const totalPayments = payments.length;
      // @ts-ignore
      const totalPaymentAmount = payments.reduce((sum, p) => 
        sum + parseFloat(p.netPay || 0), 0);
      
      // Calculate recent performance (last 7 days)
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      // @ts-ignore
      const recentAssignments = assignments.filter(a => 
        new Date(a.assignmentDate) >= sevenDaysAgo
      );
      
      // @ts-ignore
      const recentCompleted = recentAssignments.filter(a => a.status === 'completed').length;
      const recentCompletionRate = recentAssignments.length > 0 
        ? (recentCompleted / recentAssignments.length) * 100 
        : 0;
      
      // Calculate averages
      const averageLuwangPerAssignment = totalAssignments > 0 
        ? totalLuwang / totalAssignments 
        : 0;
      
      const averagePayment = totalPayments > 0 
        ? totalPaymentAmount / totalPayments 
        : 0;
      
      const debtCollectionRate = totalDebtAmount > 0 
        ? (totalDebtPaid / totalDebtAmount) * 100 
        : 0;
      
      // Format assignments for display
      // @ts-ignore
      const formattedAssignments = assignments.slice(0, 5).map(assignment => ({
        id: assignment.id,
        luwangCount: parseFloat(assignment.luwangCount),
        status: assignment.status,
        assignmentDate: assignment.assignmentDate,
        statusColor: assignment.status === 'completed' ? 'green' : 
                    assignment.status === 'active' ? 'blue' : 'gray'
      }));
      
      // Format debts for display
      // @ts-ignore
      const formattedDebts = debts.slice(0, 5).map(debt => ({
        id: debt.id,
        amount: parseFloat(debt.amount),
        balance: parseFloat(debt.balance),
        status: debt.status,
        dateIncurred: debt.dateIncurred,
        dueDate: debt.dueDate,
        isOverdue: debt.dueDate && new Date(debt.dueDate) < new Date() && 
                  ['pending', 'partially_paid'].includes(debt.status)
      }));
      
      // Format payments for display
      // @ts-ignore
      const formattedPayments = payments.slice(0, 5).map(payment => ({
        id: payment.id,
        netPay: parseFloat(payment.netPay),
        grossPay: parseFloat(payment.grossPay),
        paymentDate: payment.paymentDate,
        status: payment.status
      }));
      
      // Calculate worker performance score
      const performanceScore = this.calculateWorkerPerformance(
        recentCompletionRate,
        averageLuwangPerAssignment,
        debtCollectionRate
      );
      
      return {
        status: true,
        message: "Worker quick view retrieved",
        data: {
          worker: {
            id: worker.id,
            name: worker.name,
            contact: worker.contact,
            email: worker.email,
            status: worker.status,
            hireDate: worker.hireDate,
          },
          overview: {
            assignments: {
              total: totalAssignments,
              completed: completedAssignments,
              active: activeAssignments,
              completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
            },
            luwang: {
              total: totalLuwang,
              completed: completedLuwang,
              averagePerAssignment: averageLuwangPerAssignment
            },
            debts: {
              total: totalDebts,
              pending: pendingDebts,
              paid: paidDebts,
              totalAmount: totalDebtAmount,
              currentBalance: totalDebtBalance,
              collectionRate: debtCollectionRate
            },
            payments: {
              total: totalPayments,
              totalAmount: totalPaymentAmount,
              average: averagePayment
            }
          },
          performance: {
            score: performanceScore,
            recentCompletionRate: recentCompletionRate,
            category: performanceScore >= 80 ? 'Excellent' :
                     performanceScore >= 60 ? 'Good' :
                     performanceScore >= 40 ? 'Average' : 'Needs Improvement'
          },
          recentActivity: {
            assignments: formattedAssignments,
            debts: formattedDebts,
            payments: formattedPayments
          },
          alerts: this.getWorkerAlerts(
            pendingDebts,
            activeAssignments,
            recentCompletionRate
          ),
          summary: {
            lastUpdated: now.toISOString(),
            overallStatus: this.getWorkerOverallStatus(
              worker.status,
              pendingDebts,
              activeAssignments
            )
          },
          filters: {
            workerId: workerId,
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getWorkerQuickView error:", error);
      throw error;
    }
  }
  

  /**
   * @param {Object} repositories
   * @param {{ currentSession: any; sessionId: any; }} params
   */
  async getMobileAlerts(repositories, params) {
    // @ts-ignore
    const { debt: debtRepo, assignment: assignmentRepo } = repositories;
    // @ts-ignore
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
          message: `${overdueDebts} overdue debts need attention`,
          priority: 'high'
        });
      }
      
      // Check for assignments due today with session filter
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let assignmentsDueTodayQuery = assignmentRepo.count({
        where: {
          assignmentDate: { $gte: today, $lt: tomorrow },
          status: 'active'
        }
      });
      
      if (currentSession && sessionId) {
        // @ts-ignore
        assignmentsDueTodayQuery = assignmentRepo
          .createQueryBuilder("assignment")
          .where("assignment.assignmentDate >= :today AND assignment.assignmentDate < :tomorrow", {
            today,
            tomorrow
          })
          .andWhere("assignment.status = :status", { status: 'active' })
          .andWhere("assignment.session.id = :sessionId", { sessionId })
          .getCount();
      }
      
      const assignmentsDueToday = await assignmentsDueTodayQuery;
      
      if (assignmentsDueToday > 0) {
        alerts.push({
          type: 'info',
          title: 'Today\'s Assignments',
          message: `${assignmentsDueToday} assignments due today`,
          priority: 'medium'
        });
      }
      
    } catch (error) {
      console.error("getMobileAlerts error:", error);
    }
    
    return alerts.slice(0, 3); // Limit to 3 alerts for mobile
  }
  
  /**
   * Format time ago
   * @param {string | number | Date} date - Date to format
   * @returns {string} Formatted time string
   */
  formatTimeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    // @ts-ignore
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }
  
  /**
   * Calculate overall health score
   * @param {number} completionRate - Assignment completion rate
   * @param {number} debtBalance - Total debt balance
   * @param {number} totalDebt - Total debt amount
   * @returns {string} Health status
   */
  calculateOverallHealth(completionRate, debtBalance, totalDebt) {
    let healthScore = 0;
    
    // Completion rate component (40%)
    healthScore += Math.min(completionRate, 100) * 0.4;
    
    // Debt health component (40%)
    const debtRatio = totalDebt > 0 ? debtBalance / totalDebt : 0;
    const debtHealth = (1 - debtRatio) * 100;
    healthScore += Math.min(debtHealth, 100) * 0.4;
    
    // Base component (20%)
    healthScore += 20;
    
    if (healthScore >= 80) return 'excellent';
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'fair';
    return 'needs_attention';
  }
  
 
  /**
   * @param {number} pendingDebts
   * @param {number} activeAssignments
   * @param {number} completionRate
   */
  getPriorityActions(pendingDebts, activeAssignments, completionRate) {
    const actions = [];
    
    if (pendingDebts > 5) {
      actions.push('Review pending debts');
    }
    
    if (activeAssignments > 10) {
      actions.push('Monitor active assignments');
    }
    
    if (completionRate < 50) {
      actions.push('Improve assignment completion');
    }
    
    if (actions.length === 0) {
      actions.push('All systems normal');
    }
    
    return actions.slice(0, 3);
  }
  
  /**
   * Calculate worker performance score
   * @param {number} completionRate - Assignment completion rate
   * @param {number} averageLuwang - Average luwang per assignment
   * @param {number} debtCollectionRate - Debt collection rate
   * @returns {number} Performance score
   */
  calculateWorkerPerformance(completionRate, averageLuwang, debtCollectionRate) {
    let score = 0;
    
    // Completion rate component (50%)
    score += Math.min(completionRate, 100) * 0.5;
    
    // Luwang productivity component (30%)
    const luwangScore = Math.min((averageLuwang / 10) * 100, 100); // Assuming 10 is good average
    score += luwangScore * 0.3;
    
    // Debt management component (20%)
    score += Math.min(debtCollectionRate, 100) * 0.2;
    
    return Math.round(score);
  }
  

  /**
   * @param {number} pendingDebts
   * @param {number} activeAssignments
   * @param {number} completionRate
   */
  getWorkerAlerts(pendingDebts, activeAssignments, completionRate) {
    const alerts = [];
    
    if (pendingDebts > 0) {
      alerts.push({
        type: 'debt',
        message: `${pendingDebts} pending debt${pendingDebts > 1 ? 's' : ''}`,
        priority: pendingDebts > 3 ? 'high' : 'medium'
      });
    }
    
    if (activeAssignments > 5) {
      alerts.push({
        type: 'assignment',
        message: `${activeAssignments} active assignment${activeAssignments > 1 ? 's' : ''}`,
        priority: 'medium'
      });
    }
    
    if (completionRate < 50) {
      alerts.push({
        type: 'performance',
        message: 'Low completion rate',
        priority: 'low'
      });
    }
    
    return alerts;
  }
  
  /**
   * Get worker overall status
   * @param {string} status - Worker status
   * @param {number} pendingDebts - Number of pending debts
   * @param {number} activeAssignments - Number of active assignments
   * @returns {string} Overall status
   */
  getWorkerOverallStatus(status, pendingDebts, activeAssignments) {
    if (status !== 'active') return 'inactive';
    
    if (pendingDebts > 5) return 'needs_attention';
    if (activeAssignments > 10) return 'busy';
    if (activeAssignments > 0) return 'active';
    
    return 'available';
  }
}

module.exports = new MobileDashboard();