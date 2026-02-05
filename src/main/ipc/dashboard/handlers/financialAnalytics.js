// dashboard/handlers/financialAnalytics.js
//@ts-check
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

class FinancialAnalytics {
  /**
     * @param {{ payment: any; debt: any; }} repositories
     * @param {any} params
     */
  // @ts-ignore
  async getFinancialOverview(repositories, params) {
    const { payment: paymentRepo, debt: debtRepo } = repositories;
    const { currentSession = false } = params;
    
    try {
      // Current month calculations
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get total payments this month
      const currentMonthPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "SUM(payment.grossPay) as totalGross",
          "SUM(payment.netPay) as totalNet",
          "SUM(payment.totalDebtDeduction) as totalDebtDeductions",
          "COUNT(payment.id) as paymentCount"
        ])
        .where("payment.paymentDate >= :startDate", { startDate: startOfMonth })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      if (currentSession) {
        currentMonthPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const currentMonthPayments = await currentMonthPaymentsQuery.getRawOne();
      
      // Get total payments previous month
      const previousMonthPaymentsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "SUM(payment.grossPay) as totalGross",
          "SUM(payment.netPay) as totalNet"
        ])
        .where("payment.paymentDate BETWEEN :start AND :end", { 
          start: startOfPreviousMonth, 
          end: endOfPreviousMonth 
        })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      if (currentSession) {
        previousMonthPaymentsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const previousMonthPayments = await previousMonthPaymentsQuery.getRawOne();
      
      // Get debt statistics
      const debtStatsQuery = debtRepo
        .createQueryBuilder("debt")
        .select([
          "COUNT(debt.id) as totalDebts",
          "SUM(debt.amount) as totalAmount",
          "SUM(debt.balance) as totalBalance",
          "SUM(debt.totalPaid) as totalPaid",
          "AVG(debt.interestRate) as avgInterestRate"
        ]);
      
      if (currentSession) {
        debtStatsQuery.where("debt.session.id = :sessionId", { sessionId });
      }
      
      const debtStats = await debtStatsQuery.getRawOne();
      
      // Get debt by status
      const debtByStatusQuery = debtRepo
        .createQueryBuilder("debt")
        .select([
          "debt.status",
          "COUNT(debt.id) as count",
          "SUM(debt.balance) as totalBalance",
          "SUM(debt.amount) as totalAmount"
        ])
        .groupBy("debt.status");
      
      if (currentSession) {
        debtByStatusQuery.where("debt.session.id = :sessionId", { sessionId });
      }
      
      const debtByStatus = await debtByStatusQuery.getRawMany();
      
      // Calculate month-over-month growth
      const currentNet = parseFloat(currentMonthPayments?.totalNet) || 0;
      const previousNet = parseFloat(previousMonthPayments?.totalNet) || 0;
      const growthRate = previousNet > 0 ? ((currentNet - previousNet) / previousNet) * 100 : 0;
      
      // Get upcoming debt due dates
      const upcomingDueDatesQuery = debtRepo
        .createQueryBuilder("debt")
        .leftJoin("debt.worker", "worker")
        .select([
          "debt.id",
          "debt.dueDate",
          "debt.balance",
          "debt.amount",
          "worker.name as workerName"
        ])
        .where("debt.status IN (:...statuses)", { statuses: ['pending', 'partially_paid'] })
        .andWhere("debt.dueDate IS NOT NULL")
        .andWhere("debt.dueDate >= :today", { today: new Date() })
        .orderBy("debt.dueDate", "ASC")
        .limit(10);
      
      if (currentSession) {
        upcomingDueDatesQuery.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      const upcomingDueDates = await upcomingDueDatesQuery.getRawMany();
      
      return {
        status: true,
        message: "Financial overview retrieved",
        data: {
          payments: {
            currentMonth: {
              gross: parseFloat(currentMonthPayments?.totalGross) || 0,
              net: currentNet,
              debtDeductions: parseFloat(currentMonthPayments?.totalDebtDeductions) || 0,
              count: parseInt(currentMonthPayments?.paymentCount) || 0,
              averageNet: parseInt(currentMonthPayments?.paymentCount) > 0 
                ? currentNet / parseInt(currentMonthPayments?.paymentCount) 
                : 0
            },
            previousMonth: {
              gross: parseFloat(previousMonthPayments?.totalGross) || 0,
              net: previousNet
            },
            growthRate: growthRate
          },
          debts: {
            totalCount: parseInt(debtStats?.totalDebts) || 0,
            totalAmount: parseFloat(debtStats?.totalAmount) || 0,
            totalBalance: parseFloat(debtStats?.totalBalance) || 0,
            totalPaid: parseFloat(debtStats?.totalPaid) || 0,
            collectionRate: parseFloat(debtStats?.totalAmount) > 0 
              ? (parseFloat(debtStats?.totalPaid) / parseFloat(debtStats?.totalAmount)) * 100 
              : 0,
            averageInterestRate: parseFloat(debtStats?.avgInterestRate) || 0
          },
          debtStatusBreakdown: debtByStatus.map((/** @type {{ debt_status: any; count: string; totalBalance: string; totalAmount: string; }} */ item) => ({
            status: item.debt_status,
            count: parseInt(item.count),
            totalBalance: parseFloat(item.totalBalance) || 0,
            totalAmount: parseFloat(item.totalAmount) || 0
          })),
          upcomingDueDates: upcomingDueDates.map((/** @type {{ debt_id: any; debt_dueDate: string | number | Date; debt_balance: string; debt_amount: string; workerName: any; }} */ item) => ({
            debtId: item.debt_id,
            dueDate: item.debt_dueDate,
            balance: parseFloat(item.debt_balance),
            originalAmount: parseFloat(item.debt_amount),
            workerName: item.workerName,
            // @ts-ignore
            daysUntilDue: Math.ceil((new Date(item.debt_dueDate) - new Date()) / (1000 * 60 * 60 * 24))
          })),
          timestamp: new Date(),
          filters: {
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getFinancialOverview error:", error);
      throw error;
    }
  }
  
  /**
     * @param {{ debt: any; debtHistory: any; }} repositories
     * @param {{ status: any; workerId: any; startDate: any; endDate: any; currentSession?: boolean; }} params
     */
  async getDebtSummary(repositories, params) {
    const { debt: debtRepo, debtHistory: debtHistoryRepo } = repositories;
    const { status, workerId, startDate, endDate, currentSession = false } = params;
    
    try {
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      let query = debtRepo.createQueryBuilder("debt");
      
      // Select fields
      query.leftJoin("debt.worker", "worker")
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
          "worker.name as workerName",
          "worker.id as workerId"
        ]);
      
      // Apply filters
      const whereConditions = [];
      const parameters = {};
      
      if (currentSession) {
        whereConditions.push("debt.session.id = :sessionId");
        // @ts-ignore
        parameters.sessionId = sessionId;
      }
      
      if (status) {
        whereConditions.push("debt.status = :status");
        // @ts-ignore
        parameters.status = status;
      }
      
      if (workerId) {
        whereConditions.push("debt.workerId = :workerId");
        // @ts-ignore
        parameters.workerId = workerId;
      }
      
      if (startDate && endDate) {
        whereConditions.push("debt.dateIncurred BETWEEN :startDate AND :endDate");
        // @ts-ignore
        parameters.startDate = new Date(startDate);
        // @ts-ignore
        parameters.endDate = new Date(endDate);
      }
      
      if (whereConditions.length > 0) {
        query.where(whereConditions.join(" AND "), parameters);
      }
      
      // Order and limit
      query.orderBy("debt.dateIncurred", "DESC");
      
      if (!workerId && !status) {
        query.limit(50); // Limit for overview
      }
      
      const debts = await query.getRawMany();
      
      // Get debt payment history for the period
      let paymentHistory = [];
      if (startDate && endDate) {
        const paymentHistoryQuery = debtHistoryRepo
          .createQueryBuilder("history")
          .leftJoin("history.debt", "debt")
          .select([
            "DATE(history.transactionDate) as date",
            "SUM(history.amountPaid) as totalPaid",
            "COUNT(history.id) as transactionCount"
          ])
          .where("history.transactionDate BETWEEN :start AND :end", {
            start: new Date(startDate),
            end: new Date(endDate)
          })
          .andWhere("history.transactionType = :type", { type: 'payment' })
          .groupBy("DATE(history.transactionDate)")
          .orderBy("date", "ASC");
        
        if (currentSession) {
          paymentHistoryQuery.andWhere("debt.session.id = :sessionId", { sessionId });
        }
        
        paymentHistory = await paymentHistoryQuery.getRawMany();
      }
      
      // Calculate summary statistics
      const summary = debts.reduce((/** @type {{ totalDebts: number; totalOriginalAmount: number; totalAmount: number; totalBalance: number; totalPaid: number; statusCounts: { [x: string]: number; }; overdueCount: number; overdueBalance: number; }} */ acc, /** @type {{ debt_originalAmount: string; debt_amount: string; debt_balance: string; debt_totalPaid: string; debt_status: string; debt_dueDate: string | number | Date; }} */ debt) => {
        acc.totalDebts++;
        acc.totalOriginalAmount += parseFloat(debt.debt_originalAmount) || 0;
        acc.totalAmount += parseFloat(debt.debt_amount) || 0;
        acc.totalBalance += parseFloat(debt.debt_balance) || 0;
        acc.totalPaid += parseFloat(debt.debt_totalPaid) || 0;
        
        // Count by status
        if (!acc.statusCounts[debt.debt_status]) {
          acc.statusCounts[debt.debt_status] = 0;
        }
        acc.statusCounts[debt.debt_status]++;
        
        // Check for overdue
        if (debt.debt_dueDate && new Date(debt.debt_dueDate) < new Date() && 
            ['pending', 'partially_paid'].includes(debt.debt_status)) {
          acc.overdueCount++;
          acc.overdueBalance += parseFloat(debt.debt_balance) || 0;
        }
        
        return acc;
      }, {
        totalDebts: 0,
        totalOriginalAmount: 0,
        totalAmount: 0,
        totalBalance: 0,
        totalPaid: 0,
        statusCounts: {},
        overdueCount: 0,
        overdueBalance: 0
      });
      
      // Calculate collection efficiency
      const collectionRate = summary.totalAmount > 0 
        ? (summary.totalPaid / summary.totalAmount) * 100 
        : 0;
      
      // Calculate average debt metrics
      const averageDebt = summary.totalDebts > 0 ? summary.totalAmount / summary.totalDebts : 0;
      const averageBalance = summary.totalDebts > 0 ? summary.totalBalance / summary.totalDebts : 0;
      const averagePaid = summary.totalDebts > 0 ? summary.totalPaid / summary.totalDebts : 0;
      
      return {
        status: true,
        message: "Debt summary retrieved",
        data: {
          debts: debts.map((/** @type {{ debt_id: any; workerId: any; workerName: any; debt_originalAmount: string; debt_amount: string; debt_balance: string; debt_status: string; debt_dateIncurred: string | number | Date; debt_dueDate: string | number | Date; debt_interestRate: string; debt_totalPaid: string; }} */ debt) => ({
            id: debt.debt_id,
            workerId: debt.workerId,
            workerName: debt.workerName,
            originalAmount: parseFloat(debt.debt_originalAmount) || 0,
            amount: parseFloat(debt.debt_amount) || 0,
            balance: parseFloat(debt.debt_balance) || 0,
            status: debt.debt_status,
            dateIncurred: debt.debt_dateIncurred,
            dueDate: debt.debt_dueDate,
            interestRate: parseFloat(debt.debt_interestRate) || 0,
            totalPaid: parseFloat(debt.debt_totalPaid) || 0,
            // @ts-ignore
            daysSinceIncurred: Math.ceil((new Date() - new Date(debt.debt_dateIncurred)) / (1000 * 60 * 60 * 24)),
            isOverdue: debt.debt_dueDate && new Date(debt.debt_dueDate) < new Date() && 
                      ['pending', 'partially_paid'].includes(debt.debt_status)
          })),
          summary: {
            ...summary,
            collectionRate: collectionRate,
            averageDebt: averageDebt,
            averageBalance: averageBalance,
            averagePaid: averagePaid,
            averageAge: debts.length > 0 
              // @ts-ignore
              ? debts.reduce((/** @type {number} */ sum, /** @type {{ debt_dateIncurred: string | number | Date; }} */ debt) => sum + Math.ceil((new Date() - new Date(debt.debt_dateIncurred)) / (1000 * 60 * 60 * 24)), 0) / debts.length 
              : 0
          },
          paymentHistory: paymentHistory.map((/** @type {{ date: any; totalPaid: string; transactionCount: string; }} */ item) => ({
            date: item.date,
            totalPaid: parseFloat(item.totalPaid) || 0,
            transactionCount: parseInt(item.transactionCount)
          })),
          filters: {
            status: status,
            workerId: workerId,
            startDate: startDate,
            endDate: endDate,
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getDebtSummary error:", error);
      throw error;
    }
  }
  
  /**
     * @param {{ payment: any; paymentHistory: any; }} repositories
     * @param {{ period?: "month" | undefined; status: any; workerId: any; currentSession?: boolean; }} params
     */
  async getPaymentSummary(repositories, params) {
    const { payment: paymentRepo, paymentHistory: paymentHistoryRepo } = repositories;
    const { period = 'month', status, workerId, currentSession = false } = params;
    
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch(period) {
        // @ts-ignore
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        // @ts-ignore
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        // @ts-ignore
        case 'year':
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
      
      // Build query for payments
      let query = paymentRepo
        .createQueryBuilder("payment")
        .leftJoin("payment.worker", "worker")
        .leftJoin("payment.pitak", "pitak")
        .select([
          "payment.id",
          "payment.grossPay",
          "payment.netPay",
          "payment.status",
          "payment.paymentDate",
          "payment.paymentMethod",
          "payment.totalDebtDeduction",
          "payment.otherDeductions",
          "worker.name as workerName",
          "pitak.location as pitakLocation"
        ]);
      
      // Apply filters
      const whereConditions = ["payment.paymentDate BETWEEN :start AND :end"];
      const parameters = { start: startDate, end: endDate };
      
      if (currentSession) {
        whereConditions.push("payment.session.id = :sessionId");
        // @ts-ignore
        parameters.sessionId = sessionId;
      }
      
      if (status) {
        whereConditions.push("payment.status = :status");
        // @ts-ignore
        parameters.status = status;
      }
      
      if (workerId) {
        whereConditions.push("payment.workerId = :workerId");
        // @ts-ignore
        parameters.workerId = workerId;
      }
      
      query.where(whereConditions.join(" AND "), parameters);
      query.orderBy("payment.paymentDate", "DESC");
      
      const payments = await query.getRawMany();
      
      // Get payment statistics by period
      const paymentStatsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "DATE(payment.paymentDate) as date",
          "SUM(payment.grossPay) as totalGross",
          "SUM(payment.netPay) as totalNet",
          "SUM(payment.totalDebtDeduction) as totalDebtDeductions",
          "COUNT(payment.id) as paymentCount"
        ])
        .where("payment.paymentDate BETWEEN :start AND :end", { start: startDate, end: endDate })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      if (currentSession) {
        paymentStatsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const paymentStats = await paymentStatsQuery
        .groupBy("DATE(payment.paymentDate)")
        .orderBy("date", "ASC")
        .getRawMany();
      
      // Get payment methods breakdown
      const paymentMethodsQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "payment.paymentMethod",
          "COUNT(payment.id) as count",
          "SUM(payment.netPay) as totalAmount",
          "AVG(payment.netPay) as averageAmount"
        ])
        .where("payment.paymentDate BETWEEN :start AND :end", { start: startDate, end: endDate })
        .andWhere("payment.paymentMethod IS NOT NULL");
      
      if (currentSession) {
        paymentMethodsQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const paymentMethods = await paymentMethodsQuery
        .groupBy("payment.paymentMethod")
        .getRawMany();
      
      // Calculate summary
      const summary = payments.reduce((/** @type {{ totalPayments: number; totalGross: number; totalNet: number; totalDebtDeductions: number; totalOtherDeductions: number; statusCounts: { [x: string]: number; }; }} */ acc, /** @type {{ payment_grossPay: string; payment_netPay: string; payment_totalDebtDeduction: string; payment_otherDeductions: string; payment_status: string | number; }} */ payment) => {
        acc.totalPayments++;
        acc.totalGross += parseFloat(payment.payment_grossPay) || 0;
        acc.totalNet += parseFloat(payment.payment_netPay) || 0;
        acc.totalDebtDeductions += parseFloat(payment.payment_totalDebtDeduction) || 0;
        acc.totalOtherDeductions += parseFloat(payment.payment_otherDeductions) || 0;
        
        // Count by status
        if (!acc.statusCounts[payment.payment_status]) {
          acc.statusCounts[payment.payment_status] = 0;
        }
        acc.statusCounts[payment.payment_status]++;
        
        return acc;
      }, {
        totalPayments: 0,
        totalGross: 0,
        totalNet: 0,
        totalDebtDeductions: 0,
        totalOtherDeductions: 0,
        statusCounts: {}
      });
      
      // Calculate averages
      const averageGross = summary.totalPayments > 0 ? summary.totalGross / summary.totalPayments : 0;
      const averageNet = summary.totalPayments > 0 ? summary.totalNet / summary.totalPayments : 0;
      
      // Get recent payment history (changes)
      const recentHistory = await paymentHistoryRepo
        .createQueryBuilder("history")
        .leftJoin("history.payment", "payment")
        .select([
          "history.id",
          "history.actionType",
          "history.changedField",
          "history.oldValue",
          "history.newValue",
          "history.changeDate",
          "history.performedBy",
          "payment.id as paymentId"
        ])
        .orderBy("history.changeDate", "DESC")
        .limit(20)
        .getRawMany();
      
      return {
        status: true,
        message: "Payment summary retrieved",
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period
          },
          payments: payments.map((/** @type {{ payment_id: any; workerName: any; pitakLocation: any; payment_grossPay: string; payment_netPay: string; payment_status: any; payment_paymentDate: any; payment_paymentMethod: any; payment_totalDebtDeduction: string; payment_otherDeductions: string; }} */ payment) => ({
            id: payment.payment_id,
            workerName: payment.workerName,
            pitakLocation: payment.pitakLocation,
            grossPay: parseFloat(payment.payment_grossPay) || 0,
            netPay: parseFloat(payment.payment_netPay) || 0,
            status: payment.payment_status,
            paymentDate: payment.payment_paymentDate,
            paymentMethod: payment.payment_paymentMethod,
            debtDeduction: parseFloat(payment.payment_totalDebtDeduction) || 0,
            otherDeductions: parseFloat(payment.payment_otherDeductions) || 0,
            deductionPercentage: parseFloat(payment.payment_grossPay) > 0 
              // @ts-ignore
              ? ((parseFloat(payment.payment_totalDebtDeduction || 0) + parseFloat(payment.payment_otherDeductions || 0)) / parseFloat(payment.payment_grossPay)) * 100 
              : 0
          })),
          summary: {
            ...summary,
            averageGross: averageGross,
            averageNet: averageNet,
            totalDeductions: summary.totalDebtDeductions + summary.totalOtherDeductions,
            deductionRate: summary.totalGross > 0 
              ? ((summary.totalDebtDeductions + summary.totalOtherDeductions) / summary.totalGross) * 100 
              : 0
          },
          dailyStats: paymentStats.map((/** @type {{ date: any; totalGross: string; totalNet: string; totalDebtDeductions: string; paymentCount: string; }} */ stat) => ({
            date: stat.date,
            totalGross: parseFloat(stat.totalGross) || 0,
            totalNet: parseFloat(stat.totalNet) || 0,
            totalDebtDeductions: parseFloat(stat.totalDebtDeductions) || 0,
            paymentCount: parseInt(stat.paymentCount)
          })),
          paymentMethods: paymentMethods.map((/** @type {{ payment_paymentMethod: any; count: string; totalAmount: string; averageAmount: string; }} */ method) => ({
            method: method.payment_paymentMethod,
            count: parseInt(method.count),
            totalAmount: parseFloat(method.totalAmount) || 0,
            averageAmount: parseFloat(method.averageAmount) || 0,
            percentage: summary.totalNet > 0 
              ? (parseFloat(method.totalAmount) / summary.totalNet) * 100 
              : 0
          })),
          recentHistory: recentHistory.map((/** @type {{ history_id: any; paymentId: any; history_actionType: any; history_changedField: any; history_oldValue: any; history_newValue: any; history_changeDate: any; history_performedBy: any; }} */ history) => ({
            id: history.history_id,
            paymentId: history.paymentId,
            actionType: history.history_actionType,
            changedField: history.history_changedField,
            oldValue: history.history_oldValue,
            newValue: history.history_newValue,
            changeDate: history.history_changeDate,
            performedBy: history.history_performedBy
          })),
          filters: {
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getPaymentSummary error:", error);
      throw error;
    }
  }
  
  /**
     * @param {{ payment: any; }} repositories
     * @param {{ period?: "month" | undefined; groupBy?: "daily" | undefined; currentSession?: boolean; }} params
     */
  async getRevenueTrend(repositories, params) {
    const { payment: paymentRepo } = repositories;
    const { period = 'month', groupBy = 'daily', currentSession = false } = params;
    
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      // @ts-ignore
      // @ts-ignore
      let dateFormat, groupByClause;
      
      // Set period and grouping
      switch(period) {
        // @ts-ignore
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          dateFormat = groupBy === 'daily' ? '%Y-%m-%d' : '%Y-%m-%d %H:00:00';
          groupByClause = groupBy === 'daily' ? 'DATE(payment.paymentDate)' : 'STRFTIME("%Y-%m-%d %H:00:00", payment.paymentDate)';
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          dateFormat = '%Y-%m-%d';
          groupByClause = 'DATE(payment.paymentDate)';
          break;
        // @ts-ignore
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          dateFormat = '%Y-%m-%W'; // Weekly grouping for quarter
          groupByClause = 'STRFTIME("%Y-%m-%W", payment.paymentDate)';
          break;
        // @ts-ignore
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          dateFormat = '%Y-%m'; // Monthly grouping for year
          groupByClause = 'STRFTIME("%Y-%m", payment.paymentDate)';
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
          dateFormat = '%Y-%m-%d';
          groupByClause = 'DATE(payment.paymentDate)';
      }
      
      // Get current session ID if requested
      let sessionId = null;
      if (currentSession) {
        sessionId = await farmSessionDefaultSessionId();
      }
      
      // Get revenue trend data
      const trendDataQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          `${groupByClause} as period`,
          "SUM(payment.grossPay) as grossRevenue",
          "SUM(payment.netPay) as netRevenue",
          "SUM(payment.totalDebtDeduction) as debtCollections",
          "COUNT(payment.id) as transactionCount",
          "AVG(payment.netPay) as averageTransactionValue"
        ])
        .where("payment.paymentDate BETWEEN :start AND :end", { start: startDate, end: endDate })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      if (currentSession) {
        trendDataQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const trendData = await trendDataQuery
        .groupBy(groupByClause)
        .orderBy("period", "ASC")
        .getRawMany();
      
      // Calculate growth metrics
      let weekOverWeekGrowth = 0;
      let monthOverMonthGrowth = 0;
      
      if (trendData.length >= 2) {
        const currentPeriod = parseFloat(trendData[trendData.length - 1]?.netRevenue) || 0;
        const previousPeriod = parseFloat(trendData[trendData.length - 2]?.netRevenue) || 0;
        
        if (previousPeriod > 0) {
          weekOverWeekGrowth = ((currentPeriod - previousPeriod) / previousPeriod) * 100;
        }
      }
      
      // Get revenue by payment method
      const revenueByMethodQuery = paymentRepo
        .createQueryBuilder("payment")
        .select([
          "payment.paymentMethod",
          "SUM(payment.netPay) as revenue",
          "COUNT(payment.id) as count",
          "AVG(payment.netPay) as average"
        ])
        .where("payment.paymentDate BETWEEN :start AND :end", { start: startDate, end: endDate })
        .andWhere("payment.status = :status", { status: 'completed' })
        .andWhere("payment.paymentMethod IS NOT NULL");
      
      if (currentSession) {
        revenueByMethodQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const revenueByMethod = await revenueByMethodQuery
        .groupBy("payment.paymentMethod")
        .getRawMany();
      
      // Get revenue by worker (top earners)
      const topEarnersQuery = paymentRepo
        .createQueryBuilder("payment")
        .leftJoin("payment.worker", "worker")
        .select([
          "worker.name as workerName",
          "SUM(payment.netPay) as revenue",
          "COUNT(payment.id) as paymentCount",
          "AVG(payment.netPay) as averagePayment"
        ])
        .where("payment.paymentDate BETWEEN :start AND :end", { start: startDate, end: endDate })
        .andWhere("payment.status = :status", { status: 'completed' });
      
      if (currentSession) {
        topEarnersQuery.andWhere("payment.session.id = :sessionId", { sessionId });
      }
      
      const topEarners = await topEarnersQuery
        .groupBy("worker.name")
        .orderBy("revenue", "DESC")
        .limit(10)
        .getRawMany();
      
      // Calculate summary
      const summary = trendData.reduce((/** @type {{ totalGross: number; totalNet: number; totalDebtCollections: number; totalTransactions: number; }} */ acc, /** @type {{ grossRevenue: string; netRevenue: string; debtCollections: string; transactionCount: string; }} */ period) => {
        acc.totalGross += parseFloat(period.grossRevenue) || 0;
        acc.totalNet += parseFloat(period.netRevenue) || 0;
        acc.totalDebtCollections += parseFloat(period.debtCollections) || 0;
        acc.totalTransactions += parseInt(period.transactionCount) || 0;
        return acc;
      }, {
        totalGross: 0,
        totalNet: 0,
        totalDebtCollections: 0,
        totalTransactions: 0
      });
      
      summary.averageTransactionValue = summary.totalTransactions > 0 
        ? summary.totalNet / summary.totalTransactions 
        : 0;
      
      return {
        status: true,
        message: "Revenue trend data retrieved",
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period,
            groupBy: groupBy
          },
          trend: trendData.map((/** @type {{ period: any; grossRevenue: string; netRevenue: string; debtCollections: string; transactionCount: string; averageTransactionValue: string; }} */ item) => ({
            period: item.period,
            grossRevenue: parseFloat(item.grossRevenue) || 0,
            netRevenue: parseFloat(item.netRevenue) || 0,
            debtCollections: parseFloat(item.debtCollections) || 0,
            transactionCount: parseInt(item.transactionCount),
            averageTransactionValue: parseFloat(item.averageTransactionValue) || 0
          })),
          summary: summary,
          growthMetrics: {
            weekOverWeek: weekOverWeekGrowth,
            monthOverMonth: monthOverMonthGrowth,
            averageDailyRevenue: trendData.length > 0 ? summary.totalNet / trendData.length : 0
          },
          revenueByMethod: revenueByMethod.map((/** @type {{ payment_paymentMethod: any; revenue: string; count: string; average: string; }} */ method) => ({
            method: method.payment_paymentMethod || 'Unknown',
            revenue: parseFloat(method.revenue) || 0,
            count: parseInt(method.count),
            average: parseFloat(method.average) || 0,
            percentage: summary.totalNet > 0 ? (parseFloat(method.revenue) / summary.totalNet) * 100 : 0
          })),
          topEarners: topEarners.map((/** @type {{ workerName: any; revenue: string; paymentCount: string; averagePayment: string; }} */ earner) => ({
            workerName: earner.workerName,
            revenue: parseFloat(earner.revenue) || 0,
            paymentCount: parseInt(earner.paymentCount),
            averagePayment: parseFloat(earner.averagePayment) || 0,
            percentage: summary.totalNet > 0 ? (parseFloat(earner.revenue) / summary.totalNet) * 100 : 0
          })),
          filters: {
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getRevenueTrend error:", error);
      throw error;
    }
  }
  
  /**
     * @param {{ debt: any; debtHistory: any; }} repositories
     * @param {{ period?: "month" | undefined; currentSession?: boolean; }} params
     */
  async getDebtCollectionRate(repositories, params) {
    const { debt: debtRepo, debtHistory: debtHistoryRepo } = repositories;
    const { period = 'month', currentSession = false } = params;
    
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch(period) {
        // @ts-ignore
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        // @ts-ignore
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        // @ts-ignore
        case 'year':
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
      
      // Get debts created in the period
      const debtsInPeriodQuery = debtRepo
        .createQueryBuilder("debt")
        .select([
          "debt.id",
          "debt.amount",
          "debt.balance",
          "debt.totalPaid",
          "debt.dateIncurred",
          "debt.status"
        ])
        .where("debt.dateIncurred BETWEEN :start AND :end", { start: startDate, end: endDate });
      
      if (currentSession) {
        debtsInPeriodQuery.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      const debtsInPeriod = await debtsInPeriodQuery.getMany();
      
      // Get debt payments in the period
      const paymentsInPeriodQuery = debtHistoryRepo
        .createQueryBuilder("history")
        .leftJoin("history.debt", "debt")
        .select([
          "DATE(history.transactionDate) as date",
          "SUM(history.amountPaid) as totalCollected",
          "COUNT(history.id) as paymentCount",
          "history.debtId"
        ])
        .where("history.transactionDate BETWEEN :start AND :end", { start: startDate, end: endDate })
        .andWhere("history.transactionType = :type", { type: 'payment' })
        .groupBy("DATE(history.transactionDate)")
        .addGroupBy("history.debtId")
        .orderBy("date", "ASC");
      
      if (currentSession) {
        paymentsInPeriodQuery.andWhere("debt.session.id = :sessionId", { sessionId });
      }
      
      const paymentsInPeriod = await paymentsInPeriodQuery.getRawMany();
      
      // Calculate collection metrics
      const totalDebtAmount = debtsInPeriod.reduce((/** @type {number} */ sum, /** @type {{ amount: string; }} */ debt) => sum + parseFloat(debt.amount), 0);
      const totalCollected = debtsInPeriod.reduce((/** @type {number} */ sum, /** @type {{ totalPaid: string; }} */ debt) => sum + parseFloat(debt.totalPaid), 0);
      const totalBalance = debtsInPeriod.reduce((/** @type {number} */ sum, /** @type {{ balance: string; }} */ debt) => sum + parseFloat(debt.balance), 0);
      
      const collectionRate = totalDebtAmount > 0 ? (totalCollected / totalDebtAmount) * 100 : 0;
      
      // Get collection efficiency by debt age
      const debtAgeBuckets = {
        '0-30': { amount: 0, collected: 0, count: 0 },
        '31-60': { amount: 0, collected: 0, count: 0 },
        '61-90': { amount: 0, collected: 0, count: 0 },
        '90+': { amount: 0, collected: 0, count: 0 }
      };
      
      debtsInPeriod.forEach((/** @type {{ dateIncurred: string | number | Date; amount: string; totalPaid: string; }} */ debt) => {
        // @ts-ignore
        const ageInDays = Math.ceil((new Date() - new Date(debt.dateIncurred)) / (1000 * 60 * 60 * 24));
        let bucket;
        
        if (ageInDays <= 30) bucket = '0-30';
        else if (ageInDays <= 60) bucket = '31-60';
        else if (ageInDays <= 90) bucket = '61-90';
        else bucket = '90+';
        
        // @ts-ignore
        debtAgeBuckets[bucket].amount += parseFloat(debt.amount);
        // @ts-ignore
        debtAgeBuckets[bucket].collected += parseFloat(debt.totalPaid);
        // @ts-ignore
        debtAgeBuckets[bucket].count++;
      });
      
      // Calculate collection rate by age
      const collectionByAge = Object.keys(debtAgeBuckets).map(bucket => {
        // @ts-ignore
        const data = debtAgeBuckets[bucket];
        const rate = data.amount > 0 ? (data.collected / data.amount) * 100 : 0;
        return {
          ageBucket: bucket,
          totalAmount: data.amount,
          totalCollected: data.collected,
          remainingBalance: data.amount - data.collected,
          collectionRate: rate,
          debtCount: data.count
        };
      });
      
      // Get daily collection trend
      const dailyCollection = paymentsInPeriod.reduce((/** @type {{ [x: string]: { payments: number; }; }} */ acc, /** @type {{ date: any; totalCollected: string; paymentCount: string; }} */ payment) => {
        const date = payment.date;
        if (!acc[date]) {
          // @ts-ignore
          acc[date] = { collected: 0, payments: 0 };
        }
        // @ts-ignore
        acc[date].collected += parseFloat(payment.totalCollected) || 0;
        acc[date].payments += parseInt(payment.paymentCount) || 0;
        return acc;
      }, {});
      
      const dailyTrend = Object.keys(dailyCollection).map(date => ({
        date: date,
        collected: dailyCollection[date].collected,
        paymentCount: dailyCollection[date].payments
      // @ts-ignore
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Get debts with collection issues
      const problematicDebts = debtsInPeriod
        .filter((/** @type {{ dateIncurred: string | number | Date; amount: string; totalPaid: string; }} */ debt) => {
          // @ts-ignore
          const ageInDays = Math.ceil((new Date() - new Date(debt.dateIncurred)) / (1000 * 60 * 60 * 24));
          const collectionRate = parseFloat(debt.amount) > 0 
            ? (parseFloat(debt.totalPaid) / parseFloat(debt.amount)) * 100 
            : 0;
          return ageInDays > 30 && collectionRate < 50;
        })
        .map((/** @type {{ id: any; amount: string; totalPaid: string; balance: string; dateIncurred: string | number | Date; status: any; }} */ debt) => ({
          id: debt.id,
          amount: parseFloat(debt.amount),
          collected: parseFloat(debt.totalPaid),
          balance: parseFloat(debt.balance),
          // @ts-ignore
          ageInDays: Math.ceil((new Date() - new Date(debt.dateIncurred)) / (1000 * 60 * 60 * 24)),
          collectionRate: parseFloat(debt.amount) > 0 
            ? (parseFloat(debt.totalPaid) / parseFloat(debt.amount)) * 100 
            : 0,
          status: debt.status
        }))
        .sort((/** @type {{ ageInDays: number; }} */ a, /** @type {{ ageInDays: number; }} */ b) => b.ageInDays - a.ageInDays)
        .slice(0, 10);
      
      return {
        status: true,
        message: "Debt collection rate analysis retrieved",
        data: {
          period: {
            start: startDate,
            end: endDate,
            type: period
          },
          overallMetrics: {
            totalDebtAmount: totalDebtAmount,
            totalCollected: totalCollected,
            totalBalance: totalBalance,
            collectionRate: collectionRate,
            averageCollectionPerDebt: debtsInPeriod.length > 0 ? totalCollected / debtsInPeriod.length : 0,
            debtsCount: debtsInPeriod.length
          },
          collectionByAge: collectionByAge,
          dailyTrend: dailyTrend,
          collectionEfficiency: {
            averageDailyCollection: dailyTrend.length > 0 
              ? dailyTrend.reduce((sum, day) => sum + day.collected, 0) / dailyTrend.length 
              : 0,
            bestCollectionDay: dailyTrend.length > 0 
              ? dailyTrend.reduce((best, day) => day.collected > best.collected ? day : best, dailyTrend[0])
              : null,
            totalCollectionDays: dailyTrend.length
          },
          problematicDebts: problematicDebts,
          recommendations: collectionRate < 70 ? [
            "Consider implementing stricter payment terms for new debts",
            "Follow up on debts older than 30 days",
            "Offer payment plans for large balances"
          ] : [
            "Collection rate is healthy",
            "Continue current collection practices",
            "Monitor aging debts regularly"
          ],
          filters: {
            currentSession: currentSession
          }
        }
      };
    } catch (error) {
      console.error("getDebtCollectionRate error:", error);
      throw error;
    }
  }
}

module.exports = new FinancialAnalytics();