// ipc/payment/get/by_status.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPaymentsByStatus(params = {}) {
  try {
    const {
      // @ts-ignore
      status,
      // @ts-ignore
      startDate,
      // @ts-ignore
      endDate,
      // @ts-ignore
      sessionId,
      // @ts-ignore
      currentSession = false, // New parameter
      // @ts-ignore
      limit = 50,
      // @ts-ignore
      page = 1,
      // @ts-ignore
      sortBy = "createdAt",
      // @ts-ignore
      sortOrder = "DESC",
    } = params;

    if (!status) {
      return {
        status: false,
        message: "Status is required",
        data: null,
      };
    }

    // Validate status
    const validStatuses = ["pending", "processing", "completed", "cancelled", "partially_paid"];
    if (!validStatuses.includes(status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
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
      .where("payment.status = :status", { status });

    // Apply date filters
    if (startDate) {
      queryBuilder.andWhere("payment.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere("payment.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    if (sessionId) {
      queryBuilder.andWhere("session.id = :sessionId", { sessionId });
    }

    // Handle current session filter
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      queryBuilder.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    // Pagination parsing
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const total = await queryBuilder.getCount();

    // Protect sortBy from SQL injection by allowing only specific fields
    const SORT_FIELD_MAP = {
      createdAt: "payment.createdAt",
      paymentDate: "payment.paymentDate",
      netPay: "payment.netPay",
      grossPay: "payment.grossPay",
      id: "payment.id",
    };
    // @ts-ignore
    const orderColumn = SORT_FIELD_MAP[sortBy] || SORT_FIELD_MAP.createdAt;
    const normalizedSortOrder = (sortOrder || "DESC").toString().toUpperCase();
    const orderDirection = ["ASC", "DESC"].includes(normalizedSortOrder) ? normalizedSortOrder : "DESC";

    // Get paginated results
    const payments = await queryBuilder
      .orderBy(orderColumn, orderDirection)
      .skip(skip)
      .take(parsedLimit)
      .getMany();

    // Build insights query with same filters
    const insightsQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "COUNT(payment.id) as total_count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
        "COALESCE(AVG(payment.netPay), 0) as average_amount",
        "MIN(payment.createdAt) as earliest_payment",
        "MAX(payment.createdAt) as latest_payment",
      ])
      .where("payment.status = :status", { status });

    if (startDate) insightsQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) insightsQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (sessionId) insightsQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      insightsQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const insights = await insightsQB.getRawOne();

    // Worker distribution (apply same filters)
    const workerDistributionQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "worker.id as worker_id",
        "worker.name as worker_name",
        "COUNT(payment.id) as payment_count",
        "COALESCE(SUM(payment.netPay), 0) as total_paid",
      ])
      .where("payment.status = :status", { status });

    if (startDate) workerDistributionQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) workerDistributionQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (sessionId) workerDistributionQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      workerDistributionQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    workerDistributionQB.groupBy("worker.id, worker.name").orderBy("total_paid", "DESC").limit(10);
    const workerDistributionRaw = await workerDistributionQB.getRawMany();

    // Monthly trend for SQLite using strftime
    const monthlyTrendQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "strftime('%Y', payment.createdAt) as year",
        "strftime('%m', payment.createdAt) as month",
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as amount",
      ])
      .where("payment.status = :status", { status });

    if (startDate) monthlyTrendQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) monthlyTrendQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (sessionId) monthlyTrendQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      monthlyTrendQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    monthlyTrendQB
      .groupBy("strftime('%Y', payment.createdAt), strftime('%m', payment.createdAt)")
      .orderBy("year", "DESC")
      .addOrderBy("month", "DESC")
      .limit(6);

    const monthlyTrendRaw = await monthlyTrendQB.getRawMany();

    // Normalize outputs
    const normalizedInsights = {
      totalCount: parseInt(insights?.total_count || 0, 10),
      totalAmount: parseFloat(insights?.total_amount || 0),
      averageAmount: parseFloat(insights?.average_amount || 0),
      earliestPayment: insights?.earliest_payment || null,
      latestPayment: insights?.latest_payment || null,
    };

    const normalizedWorkerDistribution = (workerDistributionRaw || []).map((item) => ({
      workerId: parseInt(item.worker_id || 0, 10),
      workerName: item.worker_name || null,
      paymentCount: parseInt(item.payment_count || 0, 10),
      totalPaid: parseFloat(item.total_paid || 0),
    }));

    const normalizedMonthlyTrend = (monthlyTrendRaw || []).map((item) => {
      const year = parseInt(item.year, 10);
      const month = parseInt(item.month, 10);
      return {
        year,
        month,
        period: `${year}-${String(month).padStart(2, "0")}`,
        count: parseInt(item.count || 0, 10),
        amount: parseFloat(item.amount || 0),
      };
    });

    return {
      status: true,
      message: `Payments with status '${status}' retrieved successfully`,
      data: {
        status,
        payments,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
        insights: normalizedInsights,
        workerDistribution: normalizedWorkerDistribution,
        monthlyTrend: normalizedMonthlyTrend,
      },
    };
  } catch (error) {
    console.error("Error in getPaymentsByStatus:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payments by status: ${error.message}`,
      data: null,
    };
  }
};