// src/ipc/debt/get/worker_summary.ipc
//@ts-check
const { AppDataSource } = require("../../../db/dataSource");
const Debt = require("../../../../entities/Debt");
const Worker = require("../../../../entities/Worker");

/**
 * Get debt summary for a worker
 * @param {number} workerId
 * @param {number} [userId]
 */
// @ts-ignore
module.exports = async (workerId, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);
    const workerRepository = AppDataSource.getRepository(Worker);

    // Get worker info
    const worker = await workerRepository.findOne({ where: { id: workerId } });

    if (!worker) {
      return {
        status: false,
        message: "Worker not found",
        data: null,
      };
    }

    // Get all debts for this worker
    const debts = await debtRepository.find({
      // @ts-ignore
      where: { worker: { id: workerId } },
      relations: ["history", "session"],
    });

    // Calculate summary
    // @ts-ignore
    const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    // @ts-ignore
    const totalBalance = debts.reduce((sum, d) => sum + parseFloat(d.balance || 0), 0);
    // @ts-ignore
    const totalPaid = debts.reduce((sum, d) => sum + parseFloat(d.totalPaid || 0), 0);

    const activeDebts = debts.filter(
      // @ts-ignore
      (d) => parseFloat(d.balance || 0) > 0 && d.status !== "paid" && d.status !== "cancelled"
    ).length;

    const overdueDebts = debts.filter((d) => {
      // @ts-ignore
      if (!d.dueDate || parseFloat(d.balance || 0) <= 0) return false;
      // @ts-ignore
      const dueDate = new Date(d.dueDate);
      const today = new Date();
      return dueDate < today;
    }).length;

    const summary = {
      worker,
      totalDebt,
      totalBalance,
      totalPaid,
      activeDebts,
      overdueDebts,
      totalDebtsCount: debts.length,
      debtBreakdown: {
        pending: debts.filter((d) => d.status === "pending").length,
        partially_paid: debts.filter((d) => d.status === "partially_paid").length,
        paid: debts.filter((d) => d.status === "paid").length,
        cancelled: debts.filter((d) => d.status === "cancelled").length,
        overdue: debts.filter((d) => d.status === "overdue").length,
      },
    };

    return {
      status: true,
      message: "Worker debt summary retrieved successfully",
      data: summary,
    };
  } catch (error) {
    console.error("Error getting worker debt summary:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};