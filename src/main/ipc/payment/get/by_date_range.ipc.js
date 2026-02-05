// ipc/payment/get/by_date_range.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPaymentsByDateRange(params = {}) {
  try {
    const {
      // @ts-ignore
      startDate,
      // @ts-ignore
      endDate,
      // @ts-ignore
      status,
      // @ts-ignore
      workerId,
      // @ts-ignore
      pitakId,
      // @ts-ignore
      sessionId,
      // @ts-ignore
      currentSession = false, // New parameter
      // @ts-ignore
      limit = 50,
      // @ts-ignore
      page = 1,
      // @ts-ignore
      groupBy = "day", // 'day', 'week', 'month', 'year'
    } = params;

    if (!startDate || !endDate) {
      return {
        status: false,
        message: "Start date and end date are required",
        data: null,
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (start > end) {
      return {
        status: false,
        message: "Start date must be before end date",
        data: null,
      };
    }

    // Limit date range to prevent overwhelming queries
    const maxDays = 365; // 1 year maximum
    // @ts-ignore
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > maxDays) {
      return {
        status: false,
        message: `Date range cannot exceed ${maxDays} days`,
        data: null,
      };
    }

    const paymentRepository = AppDataSource.getRepository(Payment);

    // Base query: join worker, pitak, and session
    const queryBuilder = paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "session") // Added session
      .where("payment.createdAt BETWEEN :start AND :end", { start, end });

    // Apply additional filters
    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    }

    if (workerId) {
      queryBuilder.andWhere("worker.id = :workerId", { workerId });
    }

    if (pitakId) {
      queryBuilder.andWhere("pitak.id = :pitakId", { pitakId });
    }

    if (sessionId) {
      queryBuilder.andWhere("session.id = :sessionId", { sessionId });
    }

    // Handle current session filter
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      queryBuilder.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    // Calculate pagination
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const total = await queryBuilder.getCount();

    // Get paginated results
    const payments = await queryBuilder
      .orderBy("payment.createdAt", "DESC")
      .skip(skip)
      .take(parsedLimit)
      .getMany();

    // Build groupBy clause and date format for SQLite (strftime)
    let groupByExpr;
    let dateFormat;
    switch (groupBy) {
      case "week":
        groupByExpr = "strftime('%Y-%W', payment.createdAt)";
        dateFormat = "%Y Week %W";
        break;
      case "month":
        groupByExpr = "strftime('%Y-%m', payment.createdAt)";
        dateFormat = "%Y-%m";
        break;
      case "year":
        groupByExpr = "strftime('%Y', payment.createdAt)";
        dateFormat = "%Y";
        break;
      case "day":
      default:
        groupByExpr = "strftime('%Y-%m-%d', payment.createdAt)";
        dateFormat = "%Y-%m-%d";
        break;
    }

    // Aggregated data (apply same filters)
    const aggregatedQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        `${groupByExpr} as period`,
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.grossPay), 0) as total_gross",
        "COALESCE(SUM(payment.netPay), 0) as total_net",
        "COALESCE(AVG(payment.netPay), 0) as average_net",
      ])
      .where("payment.createdAt BETWEEN :start AND :end", { start, end });

    if (status) aggregatedQB.andWhere("payment.status = :status", { status });
    if (workerId) aggregatedQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) aggregatedQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) aggregatedQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      aggregatedQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    aggregatedQB.groupBy(groupByExpr).orderBy("period", "DESC");
    const aggregatedData = await aggregatedQB.getRawMany();

    // Summary for the date range (apply same filters)
    const summaryQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "COUNT(payment.id) as total_payments",
        "COALESCE(SUM(payment.grossPay), 0) as total_gross",
        "COALESCE(SUM(payment.netPay), 0) as total_net",
        "COALESCE(SUM(payment.totalDebtDeduction), 0) as total_debt",
        "COALESCE(SUM(payment.manualDeduction), 0) as total_manual",
        "COALESCE(SUM(payment.otherDeductions), 0) as total_other",
        "COALESCE(AVG(payment.netPay), 0) as average_payment",
      ])
      .where("payment.createdAt BETWEEN :start AND :end", { start, end });

    if (status) summaryQB.andWhere("payment.status = :status", { status });
    if (workerId) summaryQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) summaryQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) summaryQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      summaryQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const summary = await summaryQB.getRawOne();

    // Top performers (apply same filters)
    const topPerformersQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "worker.id as worker_id",
        "worker.name as worker_name",
        "COUNT(payment.id) as payment_count",
        "COALESCE(SUM(payment.netPay), 0) as total_earned",
      ])
      .where("payment.createdAt BETWEEN :start AND :end", { start, end });

    if (status) topPerformersQB.andWhere("payment.status = :status", { status });
    if (workerId) topPerformersQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) topPerformersQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) topPerformersQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      topPerformersQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    topPerformersQB.groupBy("worker.id, worker.name").orderBy("total_earned", "DESC").limit(10);
    const topPerformers = await topPerformersQB.getRawMany();

    // Normalize aggregatedData
    const normalizedAggregated = (aggregatedData || []).map((item) => ({
      period: item.period,
      count: parseInt(item.count || 0, 10),
      totalGross: parseFloat(item.total_gross || 0),
      totalNet: parseFloat(item.total_net || 0),
      averageNet: parseFloat(item.average_net || 0),
    }));

    // Normalize summary
    const normalizedSummary = {
      totalPayments: parseInt(summary?.total_payments || 0, 10),
      totalGross: parseFloat(summary?.total_gross || 0),
      totalNet: parseFloat(summary?.total_net || 0),
      totalDeductions:
        parseFloat(summary?.total_debt || 0) +
        parseFloat(summary?.total_manual || 0) +
        parseFloat(summary?.total_other || 0),
      averagePayment: parseFloat(summary?.average_payment || 0),
    };

    // Normalize top performers
    const normalizedTop = (topPerformers || []).map((item) => ({
      workerId: parseInt(item.worker_id, 10),
      workerName: item.worker_name,
      paymentCount: parseInt(item.payment_count || 0, 10),
      totalEarned: parseFloat(item.total_earned || 0),
    }));

    return {
      status: true,
      message: "Payments by date range retrieved successfully",
      data: {
        dateRange: {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          days: diffDays,
        },
        payments,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
        aggregatedData: normalizedAggregated,
        summary: normalizedSummary,
        topPerformers: normalizedTop,
        periodAnalysis: {
          groupBy,
          format: dateFormat,
          dataPoints: normalizedAggregated.length,
        },
      },
    };
  } catch (error) {
    console.error("Error in getPaymentsByDateRange:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payments by date range: ${error.message}`,
      data: null,
    };
  }
};