// ipc/payment/get/by_pitak.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const Pitak = require("../../../../entities/Pitak");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPaymentsByPitak(params = {}) {
  try {
    const {
      // @ts-ignore
      pitakId,
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

    if (!pitakId) {
      return {
        status: false,
        message: "Pitak ID is required",
        data: null,
      };
    }

    // Check if pitak exists
    const pitakRepository = AppDataSource.getRepository(Pitak);
    const pitak = await pitakRepository.findOne({
      where: { id: pitakId },
    });

    if (!pitak) {
      return {
        status: false,
        message: "Pitak not found",
        data: null,
      };
    }

    const paymentRepository = AppDataSource.getRepository(Payment);

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
    const orderDirection = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Base query: join worker, pitak, and session
    const queryBuilder = paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "session") // Added session
      .where("pitak.id = :pitakId", { pitakId });

    // Apply filters
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

    if (sessionId) {
      queryBuilder.andWhere("session.id = :sessionId", { sessionId });
    }

    // Handle current session filter
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      queryBuilder.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    // Calculate pagination
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await queryBuilder.getCount();

    // Get paginated results
    const payments = await queryBuilder
      .orderBy(orderColumn, orderDirection)
      .skip(skip)
      .take(parseInt(limit, 10))
      .getMany();

    // Build summary query with same filters
    const summaryQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "COALESCE(SUM(payment.grossPay), 0) as total_gross",
        "COALESCE(SUM(payment.netPay), 0) as total_net",
        "COALESCE(SUM(payment.totalDebtDeduction), 0) as total_debt_deductions",
        "COUNT(payment.id) as payment_count",
        "COUNT(DISTINCT worker.id) as unique_workers",
      ])
      .where("pitak.id = :pitakId", { pitakId });

    if (status) summaryQB.andWhere("payment.status = :status", { status });
    if (startDate) summaryQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) summaryQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (sessionId) summaryQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      summaryQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const summary = await summaryQB.getRawOne();

    // Timeline for SQLite using strftime
    const timelineQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "strftime('%Y', payment.createdAt) as year",
        "strftime('%m', payment.createdAt) as month",
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
      ])
      .where("pitak.id = :pitakId", { pitakId });

    if (status) timelineQB.andWhere("payment.status = :status", { status });
    if (startDate) timelineQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) timelineQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (sessionId) timelineQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      timelineQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    timelineQB
      .groupBy("strftime('%Y', payment.createdAt), strftime('%m', payment.createdAt)")
      .orderBy("year", "DESC")
      .addOrderBy("month", "DESC")
      .limit(12);

    const timeline = await timelineQB.getRawMany();

    // Normalize summary values (handle nulls)
    const normalizedSummary = {
      totalGross: parseFloat(summary?.total_gross || 0),
      totalNet: parseFloat(summary?.total_net || 0),
      totalDebtDeductions: parseFloat(summary?.total_debt_deductions || 0),
      paymentCount: parseInt(summary?.payment_count || 0, 10),
      uniqueWorkers: parseInt(summary?.unique_workers || 0, 10),
    };

    // Normalize timeline
    const normalizedTimeline = (timeline || []).map((item) => {
      const year = parseInt(item.year, 10);
      const month = parseInt(item.month, 10);
      return {
        year,
        month,
        period: `${year}-${String(month).padStart(2, "0")}`,
        count: parseInt(item.count || 0, 10),
        totalAmount: parseFloat(item.total_amount || 0),
      };
    });

    return {
      status: true,
      message: "Payments by pitak retrieved successfully",
      data: {
        pitak: {
          id: pitak.id,
          location: pitak.location,
          totalLuwang: pitak.totalLuwang,
          status: pitak.status,
        },
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: normalizedSummary,
        timeline: normalizedTimeline,
      },
    };
  } catch (error) {
    console.error("Error in getPaymentsByPitak:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payments by pitak: ${error.message}`,
      data: null,
    };
  }
};