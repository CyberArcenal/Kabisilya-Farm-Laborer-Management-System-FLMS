// ipc/payment/get/all.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getAllPayments(params = {}) {
  try {
    const {
      // @ts-ignore
      page = 1,
      // @ts-ignore
      limit = 50,
      // @ts-ignore
      status,
      // @ts-ignore
      startDate,
      // @ts-ignore
      endDate,
      // @ts-ignore
      workerId,
      // @ts-ignore
      pitakId,
      // @ts-ignore
      sessionId,
      // @ts-ignore
      currentSession = false, // New parameter
      // @ts-ignore
      sortBy = "createdAt",
      // @ts-ignore
      sortOrder = "DESC",
    } = params;

    const paymentRepository = AppDataSource.getRepository(Payment);

    // Base query: join worker, pitak, and session
    const queryBuilder = paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "session"); // Added session

    // Apply filters to main list
    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    }

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

    // Get paginated results with sorting
    const payments = await queryBuilder
      .orderBy(orderColumn, orderDirection)
      .skip(skip)
      .take(parsedLimit)
      .getMany();

    // Summary statistics (apply same filters)
    const summaryQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "COALESCE(SUM(payment.grossPay), 0) as total_gross",
        "COALESCE(SUM(payment.netPay), 0) as total_net",
        "COALESCE(SUM(payment.totalDebtDeduction), 0) as total_debt_deductions",
        "COALESCE(SUM(payment.manualDeduction), 0) as total_manual_deductions",
        "COALESCE(SUM(payment.otherDeductions), 0) as total_other_deductions",
        "COUNT(payment.id) as total_count",
      ]);

    if (status) summaryQB.andWhere("payment.status = :status", { status });
    if (startDate) summaryQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) summaryQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (workerId) summaryQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) summaryQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) summaryQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      summaryQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const summary = await summaryQB.getRawOne();

    // Status distribution (apply same filters)
    const statusDistQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "payment.status as status",
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
      ]);

    if (status) statusDistQB.andWhere("payment.status = :status", { status });
    if (startDate) statusDistQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) statusDistQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (workerId) statusDistQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) statusDistQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) statusDistQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      statusDistQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    statusDistQB.groupBy("payment.status");
    const statusDistributionRaw = await statusDistQB.getRawMany();

    const statusDistribution = statusDistributionRaw.map((item) => ({
      status: item.status,
      count: parseInt(item.count || 0, 10),
      totalAmount: parseFloat(item.total_amount || 0),
    }));

    return {
      status: true,
      message: "Payments retrieved successfully",
      data: {
        payments,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
        summary: {
          totalGross: parseFloat(summary?.total_gross || 0),
          totalNet: parseFloat(summary?.total_net || 0),
          totalDebtDeductions: parseFloat(summary?.total_debt_deductions || 0),
          totalManualDeductions: parseFloat(summary?.total_manual_deductions || 0),
          totalOtherDeductions: parseFloat(summary?.total_other_deductions || 0),
          totalCount: parseInt(summary?.total_count || 0, 10),
        },
        statusDistribution,
      },
    };
  } catch (error) {
    console.error("Error in getAllPayments:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payments: ${error.message}`,
      data: null,
    };
  }
};