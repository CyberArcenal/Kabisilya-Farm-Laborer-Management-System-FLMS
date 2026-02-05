// ipc/payment/get/stats.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPaymentStats(params = {}) {
  try {
    // @ts-ignore
    const { year, month, currentSession = false } = params; // New parameter

    const paymentRepository = AppDataSource.getRepository(Payment);

    // Helper to apply session filter to a query builder
    // @ts-ignore
    const applySessionFilter = async (qb) => {
      if (currentSession) {
        const currentSessionId = await farmSessionDefaultSessionId();
        qb.leftJoin("payment.session", "session")
          .andWhere("session.id = :currentSessionId", { currentSessionId });
      }
      return qb;
    };

    // Build date filters
    let startDate = null;
    let endDate = null;
    if (year) {
      startDate = new Date(`${year}-01-01`);
      endDate = new Date(`${year}-12-31T23:59:59.999Z`);
    }
    if (year && month) {
      startDate = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
      // endDate = last day of month
      endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Helper to apply date filter to a query builder
    // @ts-ignore
    const applyDateFilter = (qb) => {
      if (startDate && endDate) {
        qb.andWhere("payment.createdAt BETWEEN :start AND :end", { start: startDate, end: endDate });
      } else if (startDate) {
        qb.andWhere("payment.createdAt >= :start", { start: startDate });
      } else if (endDate) {
        qb.andWhere("payment.createdAt <= :end", { end: endDate });
      }
      return qb;
    };

    // Overall statistics (use a fresh QB)
    const overallQB = paymentRepository.createQueryBuilder("payment").select([
      "COUNT(payment.id) as total_payments",
      "COALESCE(SUM(payment.grossPay), 0) as total_gross",
      "COALESCE(SUM(payment.netPay), 0) as total_net",
      "COALESCE(AVG(payment.netPay), 0) as average_payment",
      "COALESCE(MIN(payment.netPay), 0) as min_payment",
      "COALESCE(MAX(payment.netPay), 0) as max_payment",
    ]);
    applyDateFilter(overallQB);
    if (currentSession) await applySessionFilter(overallQB);
    const overallStats = (await overallQB.getRawOne()) || {};

    // Status distribution (fresh QB)
    const statusQB = paymentRepository.createQueryBuilder("payment")
      .select([
        "payment.status as status",
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
        "COALESCE(AVG(payment.netPay), 0) as average_amount",
      ]);
    applyDateFilter(statusQB);
    if (currentSession) await applySessionFilter(statusQB);
    statusQB.groupBy("payment.status");
    const statusStats = await statusQB.getRawMany();

    // Monthly trend (SQLite-compatible using strftime) when year specified
    let monthlyTrend = [];
    if (year) {
      const monthlyQB = paymentRepository.createQueryBuilder("payment")
        .select([
          "CAST(strftime('%m', payment.createdAt) AS INTEGER) as month",
          "COUNT(payment.id) as count",
          "COALESCE(SUM(payment.netPay), 0) as total_amount",
          "COALESCE(AVG(payment.netPay), 0) as average_amount",
        ])
        .where("strftime('%Y', payment.createdAt) = :year", { year: String(year) });
      // If month filter was provided we already narrowed overall; but keep applyDateFilter for consistency
      applyDateFilter(monthlyQB);
      if (currentSession) await applySessionFilter(monthlyQB);
      monthlyQB.groupBy("strftime('%m', payment.createdAt)").orderBy("month", "ASC");
      monthlyTrend = await monthlyQB.getRawMany();
    }

    // Top workers by payment amount (apply date filter)
    const topWorkersQB = paymentRepository.createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .select([
        "worker.id as worker_id",
        "worker.name as worker_name",
        "COUNT(payment.id) as payment_count",
        "COALESCE(SUM(payment.netPay), 0) as total_paid",
        "COALESCE(AVG(payment.netPay), 0) as average_payment",
      ]);
    applyDateFilter(topWorkersQB);
    if (currentSession) await applySessionFilter(topWorkersQB);
    topWorkersQB.groupBy("worker.id, worker.name").orderBy("total_paid", "DESC").limit(10);
    const topWorkers = await topWorkersQB.getRawMany();

    // Payment method distribution
    const methodQB = paymentRepository.createQueryBuilder("payment")
      .select([
        "payment.paymentMethod as method",
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
      ])
      .where("payment.paymentMethod IS NOT NULL");
    applyDateFilter(methodQB);
    if (currentSession) await applySessionFilter(methodQB);
    methodQB.groupBy("payment.paymentMethod");
    const methodStats = await methodQB.getRawMany();

    // Deduction statistics
    const deductionQB = paymentRepository.createQueryBuilder("payment")
      .select([
        "COALESCE(SUM(payment.totalDebtDeduction), 0) as total_debt_deductions",
        "COALESCE(SUM(payment.manualDeduction), 0) as total_manual_deductions",
        "COALESCE(SUM(payment.otherDeductions), 0) as total_other_deductions",
        "COALESCE(AVG(payment.totalDebtDeduction), 0) as average_debt_deduction",
      ]);
    applyDateFilter(deductionQB);
    if (currentSession) await applySessionFilter(deductionQB);
    const deductionStats = (await deductionQB.getRawOne()) || {};

    // Completion rate (completed vs total) with date filter
    const completionQB = paymentRepository.createQueryBuilder("payment")
      .select([
        "SUM(CASE WHEN payment.status = 'completed' THEN 1 ELSE 0 END) as completed_count",
        "COUNT(payment.id) as total_count",
      ]);
    applyDateFilter(completionQB);
    if (currentSession) await applySessionFilter(completionQB);
    const completionRate = (await completionQB.getRawOne()) || { completed_count: 0, total_count: 0 };

    // Normalize and return
    // @ts-ignore
    const safeParseInt = (v) => parseInt(v || 0, 10);
    // @ts-ignore
    const safeParseFloat = (v) => parseFloat(v || 0);

    return {
      status: true,
      message: "Payment statistics retrieved successfully",
      data: {
        period: year ? (month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`) : "All time",
        currentSessionFilter: currentSession,
        overall: {
          totalPayments: safeParseInt(overallStats.total_payments),
          totalGross: safeParseFloat(overallStats.total_gross),
          totalNet: safeParseFloat(overallStats.total_net),
          averagePayment: safeParseFloat(overallStats.average_payment),
          minPayment: safeParseFloat(overallStats.min_payment),
          maxPayment: safeParseFloat(overallStats.max_payment),
          completionRate:
            parseInt(completionRate.total_count || 0, 10) > 0
              ? (parseInt(completionRate.completed_count || 0, 10) / parseInt(completionRate.total_count || 0, 10)) * 100
              : 0,
        },
        statusDistribution: (statusStats || []).map((item) => ({
          status: item.status,
          count: safeParseInt(item.count),
          totalAmount: safeParseFloat(item.total_amount),
          averageAmount: safeParseFloat(item.average_amount),
          percentage:
            safeParseInt(overallStats.total_payments) > 0
              ? (safeParseInt(item.count) / safeParseInt(overallStats.total_payments)) * 100
              : 0,
        })),
        monthlyTrend: (monthlyTrend || []).map((item) => ({
          month: safeParseInt(item.month),
          monthName: new Date(2000, safeParseInt(item.month) - 1, 1).toLocaleString("default", { month: "long" }),
          count: safeParseInt(item.count),
          totalAmount: safeParseFloat(item.total_amount),
          averageAmount: safeParseFloat(item.average_amount),
        })),
        topWorkers: (topWorkers || []).map((item) => ({
          workerId: safeParseInt(item.worker_id),
          workerName: item.worker_name,
          paymentCount: safeParseInt(item.payment_count),
          totalPaid: safeParseFloat(item.total_paid),
          averagePayment: safeParseFloat(item.average_payment),
        })),
        paymentMethods: (methodStats || []).map((item) => ({
          method: item.method,
          count: safeParseInt(item.count),
          totalAmount: safeParseFloat(item.total_amount),
        })),
        deductions: {
          totalDebtDeductions: safeParseFloat(deductionStats.total_debt_deductions),
          totalManualDeductions: safeParseFloat(deductionStats.total_manual_deductions),
          totalOtherDeductions: safeParseFloat(deductionStats.total_other_deductions),
          averageDebtDeduction: safeParseFloat(deductionStats.average_debt_deduction),
          totalDeductions:
            safeParseFloat(deductionStats.total_debt_deductions) +
            safeParseFloat(deductionStats.total_manual_deductions) +
            safeParseFloat(deductionStats.total_other_deductions),
        },
      },
    };
  } catch (error) {
    console.error("Error in getPaymentStats:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payment statistics: ${error.message}`,
      data: null,
    };
  }
};