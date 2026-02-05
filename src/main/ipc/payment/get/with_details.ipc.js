// ipc/payment/get/with_details.ipc.js
//@ts-check

const Payment = require("../../../../entities/Payment");
const PaymentHistory = require("../../../../entities/PaymentHistory");
const DebtHistory = require("../../../../entities/DebtHistory");
const Worker = require("../../../../entities/Worker");
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

module.exports = async function getPaymentWithDetails(params = {}) {
  try {
    // @ts-ignore
    let { paymentId } = params;

    if (!paymentId) {
      return {
        status: false,
        message: "Payment ID is required",
        data: null,
      };
    }

    paymentId = parseInt(paymentId, 10);
    if (Number.isNaN(paymentId) || paymentId <= 0) {
      return {
        status: false,
        message: "Payment ID must be a valid positive integer",
        data: null,
      };
    }

    const paymentRepository = AppDataSource.getRepository(Payment);

    // Get payment with related data including session
    const payment = await paymentRepository.findOne({
      where: { id: paymentId },
      relations: [
        "worker",
        "pitak",
        "pitak.bukid",
        "history",
        "debtPayments",
        "debtPayments.debt",
        "assignment",
        "session", // Already included
      ],
    });

    if (!payment) {
      return {
        status: false,
        message: "Payment not found",
        data: null,
      };
    }

    // Helper to safely parse decimals returned as strings by SQLite
    // @ts-ignore
    const safeNumber = (v) => {
      if (v === null || v === undefined) return 0;
      const n = parseFloat(v);
      return Number.isNaN(n) ? 0 : n;
    };

    // Load worker details if available
    let worker = null;
    // @ts-ignore
    if (payment.worker && payment.worker.id) {
      const workerRepository = AppDataSource.getRepository(Worker);
      worker = await workerRepository.findOne({
        // @ts-ignore
        where: { id: payment.worker.id },
      });
    }

    // Worker debts
    // @ts-ignore
    let workerDebts = [];
    // @ts-ignore
    if (payment.worker && payment.worker.id) {
      const debtRepository = AppDataSource.getRepository(Debt);
      workerDebts = await debtRepository.find({
        where: {
          // @ts-ignore
          worker: { id: payment.worker.id },
          status: ["pending", "partially_paid"],
        },
        order: { dueDate: "ASC" },
      });
    }

    // Payment history
    const paymentHistoryRepository = AppDataSource.getRepository(PaymentHistory);
    const paymentHistory = await paymentHistoryRepository.find({
      // @ts-ignore
      where: { payment: { id: paymentId } },
      order: { changeDate: "DESC" },
    });

    // Linked debt payments
    const debtHistoryRepository = AppDataSource.getRepository(DebtHistory);
    const linkedDebtPayments = await debtHistoryRepository.find({
      // @ts-ignore
      where: { payment: { id: paymentId } },
      relations: ["debt"],
      order: { transactionDate: "DESC" },
    });

    // Worker statistics (use joined aliases to avoid direct column usage)
    let workerStats = { total_payments: 0, total_gross: 0, total_net: 0, average_payment: 0 };
    // @ts-ignore
    if (payment.worker && payment.worker.id) {
      workerStats = (await paymentRepository
        .createQueryBuilder("payment")
        .leftJoin("payment.worker", "worker")
        .select([
          "COUNT(payment.id) as total_payments",
          "COALESCE(SUM(payment.grossPay), 0) as total_gross",
          "COALESCE(SUM(payment.netPay), 0) as total_net",
          "COALESCE(AVG(payment.netPay), 0) as average_payment",
        ])
        // @ts-ignore
        .where("worker.id = :workerId", { workerId: payment.worker.id })
        .andWhere("payment.status = :status", { status: "completed" })
        .getRawOne()) || workerStats;
    }

    // Pitak statistics (use joined aliases)
    let pitakStats = null;
    // @ts-ignore
    if (payment.pitak && payment.pitak.id) {
      pitakStats = (await paymentRepository
        .createQueryBuilder("payment")
        .leftJoin("payment.pitak", "pitak")
        .select([
          "COUNT(payment.id) as total_payments",
          "COALESCE(SUM(payment.netPay), 0) as total_paid",
          "COUNT(DISTINCT payment.worker) as unique_workers",
        ])
        // @ts-ignore
        .where("pitak.id = :pitakId", { pitakId: payment.pitak.id })
        .getRawOne()) || null;
    }

    // Deduction breakdown
    const deductionBreakdown = {
      total:
        safeNumber(payment.totalDebtDeduction) +
        safeNumber(payment.manualDeduction || 0) +
        safeNumber(payment.otherDeductions || 0),
      byCategory: {
        debt: safeNumber(payment.totalDebtDeduction),
        manual: safeNumber(payment.manualDeduction || 0),
        other: safeNumber(payment.otherDeductions || 0),
      },
      detailed: payment.deductionBreakdown || {},
    };

    // Format linked debt payments safely
    const formattedLinkedDebtPayments = (linkedDebtPayments || []).map((dp) => ({
      id: dp.id,
      amountPaid: safeNumber(dp.amountPaid),
      previousBalance: safeNumber(dp.previousBalance),
      newBalance: safeNumber(dp.newBalance),
      transactionType: dp.transactionType || null,
      paymentMethod: dp.paymentMethod || null,
      referenceNumber: dp.referenceNumber || null,
      notes: dp.notes || null,
      // @ts-ignore
      transactionDate: dp.transactionDate ? new Date(dp.transactionDate).toISOString() : null,
      debt:
        // @ts-ignore
        dp.debt
          ? {
              // @ts-ignore
              id: dp.debt.id,
              // @ts-ignore
              originalAmount: safeNumber(dp.debt.originalAmount),
              // @ts-ignore
              amount: safeNumber(dp.debt.amount),
              // @ts-ignore
              balance: safeNumber(dp.debt.balance),
              // @ts-ignore
              reason: dp.debt.reason || null,
              // @ts-ignore
              status: dp.debt.status || null,
            }
          : null,
    }));

    // Format worker debts safely
    // @ts-ignore
    const formattedWorkerDebts = (workerDebts || []).map((d) => ({
      id: d.id,
      originalAmount: safeNumber(d.originalAmount),
      amount: safeNumber(d.amount),
      balance: safeNumber(d.balance),
      reason: d.reason || null,
      status: d.status || null,
      dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
      interestRate: safeNumber(d.interestRate),
      totalInterest: safeNumber(d.totalInterest),
      totalPaid: safeNumber(d.totalPaid),
    }));

    // Format payment history safely
    const formattedPaymentHistory = (paymentHistory || []).map((record) => ({
      id: record.id,
      actionType: record.actionType || null,
      changedField: record.changedField || null,
      oldValue: record.oldValue ?? null,
      newValue: record.newValue ?? null,
      oldAmount: record.oldAmount != null ? safeNumber(record.oldAmount) : null,
      newAmount: record.newAmount != null ? safeNumber(record.newAmount) : null,
      notes: record.notes || null,
      performedBy: record.performedBy || null,
      // @ts-ignore
      changeDate: record.changeDate ? new Date(record.changeDate).toISOString() : null,
    }));

    // Build detailed response with normalized numeric and date fields
    const detailedPayment = {
      payment: {
        id: payment.id,
        grossPay: safeNumber(payment.grossPay),
        manualDeduction: safeNumber(payment.manualDeduction || 0),
        netPay: safeNumber(payment.netPay),
        status: payment.status || null,
        // @ts-ignore
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
        paymentMethod: payment.paymentMethod || null,
        referenceNumber: payment.referenceNumber || null,
        // @ts-ignore
        periodStart: payment.periodStart ? new Date(payment.periodStart).toISOString() : null,
        // @ts-ignore
        periodEnd: payment.periodEnd ? new Date(payment.periodEnd).toISOString() : null,
        totalDebtDeduction: safeNumber(payment.totalDebtDeduction),
        otherDeductions: safeNumber(payment.otherDeductions || 0),
        deductionBreakdown: payment.deductionBreakdown || {},
        notes: payment.notes || null,
        idempotencyKey: payment.idempotencyKey || null,
        // @ts-ignore
        createdAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : null,
        // @ts-ignore
        updatedAt: payment.updatedAt ? new Date(payment.updatedAt).toISOString() : null,
        // @ts-ignore
        assignment: payment.assignment ? { id: payment.assignment.id } : null,
        // @ts-ignore
        session: payment.session ? { 
          // @ts-ignore
          id: payment.session.id,
          // @ts-ignore
          name: payment.session.name || null,
          // @ts-ignore
          year: payment.session.year || null,
          // @ts-ignore
          status: payment.session.status || null
        } : null,
      },
      worker: worker
        ? {
            id: worker.id,
            name: worker.name || null,
            totalDebt: safeNumber(worker.totalDebt),
            totalPaid: safeNumber(worker.totalPaid),
            currentBalance: safeNumber(worker.currentBalance),
            // @ts-ignore
            hireDate: worker.hireDate ? new Date(worker.hireDate).toISOString() : null,
            // @ts-ignore
            createdAt: worker.createdAt ? new Date(worker.createdAt).toISOString() : null,
            // @ts-ignore
            updatedAt: worker.updatedAt ? new Date(worker.updatedAt).toISOString() : null,
          }
        : null,
      // @ts-ignore
      pitak: payment.pitak
        ? {
            // @ts-ignore
            id: payment.pitak.id,
            // @ts-ignore
            location: payment.pitak.location || null,
            // @ts-ignore
            totalLuwang: safeNumber(payment.pitak.totalLuwang),
            // @ts-ignore
            status: payment.pitak.status || null,
            // @ts-ignore
            createdAt: payment.pitak.createdAt ? new Date(payment.pitak.createdAt).toISOString() : null,
            // @ts-ignore
            updatedAt: payment.pitak.updatedAt ? new Date(payment.pitak.updatedAt).toISOString() : null,
            // @ts-ignore
            bukid: payment.pitak.bukid ? { id: payment.pitak.bukid.id, name: payment.pitak.bukid.name || null } : null,
          }
        : null,
      deductionBreakdown,
      history: formattedPaymentHistory,
      linkedDebtPayments: formattedLinkedDebtPayments,
      workerDebts: formattedWorkerDebts,
      statistics: {
        worker: {
          // @ts-ignore
          totalPayments: parseInt(workerStats.total_payments || 0, 10),
          totalGross: safeNumber(workerStats.total_gross || 0),
          totalNet: safeNumber(workerStats.total_net || 0),
          averagePayment: safeNumber(workerStats.average_payment || 0),
        },
        pitak: pitakStats
          ? {
              totalPayments: parseInt(pitakStats.total_payments || 0, 10),
              totalPaid: safeNumber(pitakStats.total_paid || 0),
              uniqueWorkers: parseInt(pitakStats.unique_workers || 0),
            }
          : null,
      },
      timeline: {
        // @ts-ignore
        created: payment.createdAt ? new Date(payment.createdAt).toISOString() : null,
        // @ts-ignore
        lastUpdated: payment.updatedAt ? new Date(payment.updatedAt).toISOString() : null,
        // @ts-ignore
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
        period:
          payment.periodStart && payment.periodEnd
            // @ts-ignore
            ? `${new Date(payment.periodStart).toISOString().split("T")[0]} to ${new Date(payment.periodEnd).toISOString().split("T")[0]}`
            : null,
      },
    };

    return {
      status: true,
      message: "Payment with details retrieved successfully",
      data: detailedPayment,
    };
  } catch (error) {
    console.error("Error in getPaymentWithDetails:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payment with details: ${error.message}`,
      data: null,
    };
  }
};