// ipc/payment/get/pending.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPendingPayments(params = {}) {
  try {
    const {
      // @ts-ignore
      page = 1,
      // @ts-ignore
      limit = 50,
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
      overdueOnly = false,
      // @ts-ignore
      sortBy = "createdAt",
      // @ts-ignore
      sortOrder = "ASC", // ASC so oldest payments come first
    } = params;

    const paymentRepository = AppDataSource.getRepository(Payment);

    // Base query: join worker, pitak, and session
    const queryBuilder = paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.pitak", "pitak")
      .leftJoinAndSelect("payment.session", "session") // Added session
      .where("payment.status = :status", { status: "pending" });

    // Apply additional filters to main list
    if (overdueOnly) {
      // Use periodEnd < today
      queryBuilder.andWhere("payment.periodEnd < :today", { today: new Date() });
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
    const normalizedSortOrder = (sortOrder || "ASC").toString().toUpperCase();
    const orderDirection = ["ASC", "DESC"].includes(normalizedSortOrder) ? normalizedSortOrder : "ASC";

    // Get paginated results
    const payments = await queryBuilder
      .orderBy(orderColumn, orderDirection)
      .skip(skip)
      .take(parsedLimit)
      .getMany();

    // Build stats query with same filters
    const statsQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "COUNT(payment.id) as total_pending",
        "COALESCE(SUM(payment.grossPay), 0) as total_gross_pending",
        "COALESCE(SUM(payment.netPay), 0) as total_net_pending",
        "COALESCE(AVG(payment.netPay), 0) as average_pending_amount",
        "MIN(payment.createdAt) as oldest_pending_date",
      ])
      .where("payment.status = :status", { status: "pending" });

    if (overdueOnly) statsQB.andWhere("payment.periodEnd < :today", { today: new Date() });
    if (startDate) statsQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) statsQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (workerId) statsQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) statsQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) statsQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      statsQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const stats = await statsQB.getRawOne();

    // Overdue stats with same filters
    const overdueQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "COUNT(payment.id) as total_overdue",
        "COALESCE(SUM(payment.netPay), 0) as total_overdue_amount",
      ])
      .where("payment.status = :status", { status: "pending" })
      .andWhere("payment.periodEnd < :today", { today: new Date() });

    if (startDate) overdueQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) overdueQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (workerId) overdueQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) overdueQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) overdueQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      overdueQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    const overdueStats = await overdueQB.getRawOne();

    // Top workers pending (apply same filters)
    const topWorkersQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .leftJoin("payment.pitak", "pitak")
      .leftJoin("payment.session", "session") // Added session
      .select([
        "worker.id as worker_id",
        "worker.name as worker_name",
        "COUNT(payment.id) as pending_count",
        "COALESCE(SUM(payment.netPay), 0) as pending_amount",
      ])
      .where("payment.status = :status", { status: "pending" });

    if (overdueOnly) topWorkersQB.andWhere("payment.periodEnd < :today", { today: new Date() });
    if (startDate) topWorkersQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) topWorkersQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (workerId) topWorkersQB.andWhere("worker.id = :workerId", { workerId });
    if (pitakId) topWorkersQB.andWhere("pitak.id = :pitakId", { pitakId });
    if (sessionId) topWorkersQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      topWorkersQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    topWorkersQB.groupBy("worker.id, worker.name").orderBy("pending_amount", "DESC").limit(10);
    const topWorkersPending = await topWorkersQB.getRawMany();

    // Aging analysis (SQLite compatible) — days pending = julianday('now') - julianday(payment.createdAt)
    const agingExpr = "(julianday('now') - julianday(payment.createdAt))";
    const agingQB = paymentRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.session", "session") // Added session
      .select([
        `CASE
          WHEN ${agingExpr} <= 7 THEN '0-7 days'
          WHEN ${agingExpr} <= 30 THEN '8-30 days'
          WHEN ${agingExpr} <= 90 THEN '31-90 days'
          ELSE '90+ days'
        END as aging_bucket`,
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
      ])
      .where("payment.status = :status", { status: "pending" });

    if (overdueOnly) agingQB.andWhere("payment.periodEnd < :today", { today: new Date() });
    if (startDate) agingQB.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
    if (endDate) agingQB.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
    if (workerId) agingQB.andWhere("payment.workerId = :workerId", { workerId });
    if (pitakId) agingQB.andWhere("payment.pitakId = :pitakId", { pitakId });
    if (sessionId) agingQB.andWhere("session.id = :sessionId", { sessionId });
    if (currentSession) {
      const currentSessionId = await farmSessionDefaultSessionId();
      agingQB.andWhere("session.id = :currentSessionId", { currentSessionId });
    }

    agingQB.groupBy("aging_bucket");
    const agingAnalysis = await agingQB.getRawMany();

    // Helper to safely parse decimals (SQLite returns strings)
    // @ts-ignore
    const safeNumber = (v) => {
      if (v === null || v === undefined) return 0;
      const n = parseFloat(v);
      return Number.isNaN(n) ? 0 : n;
    };

    // Format payments with additional info
    const formattedPayments = (payments || []).map((p) => {
      // @ts-ignore
      const createdAt = p.createdAt ? new Date(p.createdAt) : null;
      const daysPending = createdAt ? Math.ceil((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // @ts-ignore
      const periodEndDate = p.periodEnd ? new Date(p.periodEnd) : null;
      const isOverdue = periodEndDate ? periodEndDate < new Date() : false;

      const overdueDays =
        isOverdue && periodEndDate ? Math.ceil((Date.now() - periodEndDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: p.id,
        // @ts-ignore
        worker: p.worker ? { id: p.worker.id, name: p.worker.name || null } : null,
        // @ts-ignore
        pitak: p.pitak ? { id: p.pitak.id, location: p.pitak.location || null } : null,
        // @ts-ignore
        session: p.session ? { id: p.session.id, name: p.session.name || null } : null,
        grossPay: safeNumber(p.grossPay),
        netPay: safeNumber(p.netPay),
        status: p.status,
        createdAt: createdAt ? createdAt.toISOString() : null,
        // @ts-ignore
        periodStart: p.periodStart ? new Date(p.periodStart).toISOString() : null,
        periodEnd: periodEndDate ? periodEndDate.toISOString() : null,
        daysPending,
        isOverdue,
        overdueDays,
        agingBucket: daysPending <= 7 ? "0-7 days" : daysPending <= 30 ? "8-30 days" : daysPending <= 90 ? "31-90 days" : "90+ days",
      };
    });

    // Normalize stats and aliases
    const normalizedStats = {
      totalPending: parseInt(stats?.total_pending || 0, 10),
      totalGrossPending: safeNumber(stats?.total_gross_pending || 0),
      totalNetPending: safeNumber(stats?.total_net_pending || 0),
      averagePendingAmount: safeNumber(stats?.average_pending_amount || 0),
      oldestPendingDate: stats?.oldest_pending_date || null,
    };

    const normalizedOverdue = {
      totalOverdue: parseInt(overdueStats?.total_overdue || 0, 10),
      totalOverdueAmount: safeNumber(overdueStats?.total_overdue_amount || 0),
    };

    const normalizedTopWorkers = (topWorkersPending || []).map((item) => ({
      workerId: parseInt(item.worker_id || 0, 10),
      workerName: item.worker_name || null,
      pendingCount: parseInt(item.pending_count || 0, 10),
      pendingAmount: safeNumber(item.pending_amount || 0),
    }));

    const normalizedAging = (agingAnalysis || []).map((item) => ({
      agingBucket: item.aging_bucket,
      count: parseInt(item.count || 0, 10),
      totalAmount: safeNumber(item.total_amount || 0),
    }));

    return {
      status: true,
      message: "Pending payments retrieved successfully",
      data: {
        payments: formattedPayments,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
        statistics: {
          ...normalizedStats,
          ...normalizedOverdue,
        },
        topWorkersPending: normalizedTopWorkers,
        agingAnalysis: normalizedAging,
        filters: {
          overdueOnly,
          currentSession,
          startDate: startDate || "All",
          endDate: endDate || "All",
        },
      },
    };
  } catch (error) {
    console.error("Error in getPendingPayments:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pending payments: ${error.message}`,
      data: null,
    };
  }
};