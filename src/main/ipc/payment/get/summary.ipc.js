// ipc/payment/get/summary.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

module.exports = async function getPaymentSummary(params = {}) {
  try {
    // @ts-ignore
    const { startDate, endDate, workerId, pitakId, currentSession = false } = params; // New parameter

    const paymentRepository = AppDataSource.getRepository(Payment);

    // Helper to apply filters to a query builder
    // @ts-ignore
    const applyFilters = async (qb) => {
      if (startDate) {
        qb.andWhere("payment.createdAt >= :startDate", { startDate: new Date(startDate) });
      }
      if (endDate) {
        qb.andWhere("payment.createdAt <= :endDate", { endDate: new Date(endDate) });
      }
      if (workerId) {
        qb.leftJoin("payment.worker", "worker").andWhere("worker.id = :workerId", { workerId });
      }
      if (pitakId) {
        qb.leftJoin("payment.pitak", "pitak").andWhere("pitak.id = :pitakId", { pitakId });
      }
      if (currentSession) {
        const currentSessionId = await farmSessionDefaultSessionId();
        qb.leftJoin("payment.session", "session")
          .andWhere("session.id = :currentSessionId", { currentSessionId });
      }
      return qb;
    };

    // Summary (fresh QB)
    const summaryQB = paymentRepository.createQueryBuilder("payment").select([
      "COUNT(payment.id) as total_payments",
      "COALESCE(SUM(payment.grossPay), 0) as total_gross",
      "COALESCE(SUM(payment.netPay), 0) as total_net",
      "COALESCE(SUM(payment.totalDebtDeduction), 0) as total_debt_deductions",
      "COALESCE(SUM(payment.manualDeduction), 0) as total_manual_deductions",
      "COALESCE(SUM(payment.otherDeductions), 0) as total_other_deductions",
    ]);
    await applyFilters(summaryQB);
    const summaryRaw = (await summaryQB.getRawOne()) || {};

    // Status breakdown (fresh QB)
    const statusQB = paymentRepository.createQueryBuilder("payment")
      .select([
        "payment.status as status",
        "COUNT(payment.id) as count",
        "COALESCE(SUM(payment.netPay), 0) as total_amount",
      ]);
    await applyFilters(statusQB);
    statusQB.groupBy("payment.status");
    const statusBreakdownRaw = await statusQB.getRawMany();

    // Top workers by payment amount (fresh QB)
    const topWorkersQB = paymentRepository.createQueryBuilder("payment")
      .leftJoin("payment.worker", "worker")
      .select([
        "worker.id as worker_id",
        "worker.name as worker_name",
        "COUNT(payment.id) as payment_count",
        "COALESCE(SUM(payment.netPay), 0) as total_paid",
      ]);
    await applyFilters(topWorkersQB);
    topWorkersQB.groupBy("worker.id, worker.name").orderBy("total_paid", "DESC").limit(10);
    const topWorkersRaw = await topWorkersQB.getRawMany();

    // Normalizers
    // @ts-ignore
    const safeInt = (v) => parseInt(v || 0, 10);
    // @ts-ignore
    const safeFloat = (v) => parseFloat(v || 0);

    const summary = {
      totalPayments: safeInt(summaryRaw.total_payments),
      totalGross: safeFloat(summaryRaw.total_gross),
      totalNet: safeFloat(summaryRaw.total_net),
      totalDebtDeductions: safeFloat(summaryRaw.total_debt_deductions),
      totalManualDeductions: safeFloat(summaryRaw.total_manual_deductions),
      totalOtherDeductions: safeFloat(summaryRaw.total_other_deductions),
    };

    const statusBreakdown = (statusBreakdownRaw || []).map((r) => ({
      status: r.status,
      count: safeInt(r.count),
      totalAmount: safeFloat(r.total_amount),
    }));

    const topWorkers = (topWorkersRaw || []).map((r) => ({
      workerId: safeInt(r.worker_id),
      workerName: r.worker_name || null,
      paymentCount: safeInt(r.payment_count),
      totalPaid: safeFloat(r.total_paid),
    }));

    return {
      status: true,
      message: "Payment summary retrieved successfully",
      data: {
        summary,
        statusBreakdown,
        topWorkers,
        filters: {
          currentSession,
          startDate: startDate || "All",
          endDate: endDate || "All",
          workerId: workerId || "All",
          pitakId: pitakId || "All",
        },
      },
    };
  } catch (error) {
    console.error("Error in getPaymentSummary:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payment summary: ${error.message}`,
      data: null,
    };
  }
};