// src/ipc/debt/get/collection_report.ipc

const Debt = require("../../../../entities/Debt");
const DebtHistory = require("../../../../entities/DebtHistory");
const { AppDataSource } = require("../../../db/dataSource");
const { Between, MoreThan, LessThan, Not, In } = require("typeorm");

/**
 * Generate debt collection report
 * @param {{ startDate?: string|Date; endDate?: string|Date }} dateRange
 * @param {number} [userId]
 */
module.exports = async (dateRange = {}, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);
    const debtHistoryRepository = AppDataSource.getRepository(DebtHistory);

    const { startDate, endDate } = dateRange;
    const queryStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const queryEndDate = endDate ? new Date(endDate) : new Date();

    // Get payments made in the date range
    const payments = await debtHistoryRepository.find({
      where: {
        transactionType: "payment",
        transactionDate: Between(queryStartDate, queryEndDate),
      },
      relations: ["debt", "debt.worker"],
      order: { transactionDate: "DESC" },
    });

    // Group payments by date
    const paymentsByDate = payments.reduce((acc, payment) => {
      const date = payment.transactionDate.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { date, totalAmount: 0, paymentCount: 0, payments: [] };
      }
      acc[date].totalAmount += parseFloat(payment.amountPaid);
      acc[date].paymentCount++;
      acc[date].payments.push(payment);
      return acc;
    }, {});

    // Get overdue debts
    const today = new Date();
    const overdueDebts = await debtRepository.find({
      where: {
        balance: MoreThan(0),
        dueDate: LessThan(today),
        status: Not(In(["paid", "cancelled"])),
      },
      relations: ["worker", "session"],
      order: { dueDate: "ASC" },
    });

    // Calculate totals
    const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);
    const totalOverdue = overdueDebts.reduce((sum, d) => sum + parseFloat(d.balance), 0);

    // Active debts sum via QueryBuilder
    const activeDebtsResult = await debtRepository
      .createQueryBuilder("debt")
      .select("SUM(debt.balance)", "sum")
      .where("debt.balance > 0")
      .andWhere("debt.status NOT IN (:...statuses)", { statuses: ["paid", "cancelled"] })
      .getRawOne();

    const totalActiveDebts = parseFloat(activeDebtsResult?.sum || 0);

    const collectionRate =
      totalActiveDebts > 0 ? (totalCollected / (totalCollected + totalActiveDebts)) * 100 : 0;

    const report = {
      dateRange: { startDate: queryStartDate, endDate: queryEndDate },
      summary: {
        totalCollected,
        totalPayments: payments.length,
        totalOverdue,
        totalActiveDebts,
        collectionRate: parseFloat(collectionRate.toFixed(2)),
        overdueCount: overdueDebts.length,
      },
      paymentsByDate: Object.values(paymentsByDate),
      topCollectors: Array.from(
        payments.reduce((map, p) => {
          const workerName = p.debt.worker.name;
          const amount = parseFloat(p.amountPaid);
          if (!map.has(workerName)) {
            map.set(workerName, { workerName, totalCollected: 0, paymentCount: 0 });
          }
          const entry = map.get(workerName);
          entry.totalCollected += amount;
          entry.paymentCount++;
          return map;
        }, new Map())
      )
        .map(([_, v]) => v)
        .sort((a, b) => b.totalCollected - a.totalCollected)
        .slice(0, 10),
      overdueDebts: overdueDebts.map((d) => ({
        id: d.id,
        workerName: d.worker.name,
        balance: parseFloat(d.balance),
        dueDate: d.dueDate,
        overdueDays: Math.floor((today - new Date(d.dueDate)) / (1000 * 60 * 60 * 24)),
      })),
      paymentMethods: Array.from(
        payments.reduce((map, p) => {
          const method = p.paymentMethod || "Unknown";
          if (!map.has(method)) {
            map.set(method, { method, count: 0, totalAmount: 0 });
          }
          const entry = map.get(method);
          entry.count++;
          entry.totalAmount += parseFloat(p.amountPaid);
          return map;
        }, new Map())
      ).map(([_, v]) => v),
    };

    return { status: true, message: "Debt collection report generated successfully", data: report };
  } catch (error) {
    console.error("Error generating collection report:", error);
    return { status: false, message: error.message, data: null };
  }
};