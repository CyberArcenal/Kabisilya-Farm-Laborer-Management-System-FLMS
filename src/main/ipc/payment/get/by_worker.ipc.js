// ipc/payment/get/by_worker.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPaymentsByWorker(params = {}) {
  try {
    // @ts-ignore
    let {
      // @ts-ignore
      workerId,
      // @ts-ignore
      status,
      // @ts-ignore
      statuses,
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
      pitakId,
    } = params;

    if (!workerId) {
      return {
        status: false,
        message: "Worker ID is required",
        data: null,
      };
    }

    workerId = parseInt(workerId, 10);
    if (Number.isNaN(workerId) || workerId <= 0) {
      return {
        status: false,
        message: "Worker ID must be a valid positive integer",
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
      .where("worker.id = :workerId", { workerId });

    // Apply filters
    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere("payment.status IN (:...statuses)", { statuses });
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

    // Get paginated results
    const payments = await queryBuilder
      .orderBy("payment.createdAt", "DESC")
      .skip(skip)
      .take(parsedLimit)
      .getMany();

    // Summary with same filters applied
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
      ])
      .where("worker.id = :workerId", { workerId });

    if (status) summaryQB.andWhere("payment.status = :status", { status });
    if (startDate)
      summaryQB.andWhere("payment.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    if (endDate)
      summaryQB.andWhere("payment.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
    if (pitakId) summaryQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) summaryQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      summaryQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const summary = await summaryQB.getRawOne();

    // Normalize summary values
    const normalizedSummary = {
      totalGross: parseFloat(summary?.total_gross || 0),
      totalNet: parseFloat(summary?.total_net || 0),
      totalDebtDeductions: parseFloat(summary?.total_debt_deductions || 0),
      paymentCount: parseInt(summary?.payment_count || 0, 10),
    };

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
        summary: normalizedSummary,
      },
    };
  } catch (error) {
    console.error("Error in getPaymentsByWorker:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payments: ${error.message}`,
      data: null,
    };
  }
};