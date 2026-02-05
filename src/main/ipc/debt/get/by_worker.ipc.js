// src/ipc/debt/get/by_worker.ipc
// @ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get debts by worker with optional filters
 * @param {number} workerId
 * @param {{ status?: string; date_from?: string|Date; date_to?: string|Date; only_active?: boolean }} filters
 * @param {number} [userId]
 */
// @ts-ignore
module.exports = async (workerId, filters = {}, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);

    const qb = debtRepository
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .leftJoinAndSelect("debt.history", "history")
      .where("worker.id = :workerId", { workerId })
      .orderBy("debt.dateIncurred", "DESC");


    // Apply filters
    if (filters.status) {
      qb.andWhere("debt.status = :status", { status: filters.status });
    }

    if (filters.date_from && filters.date_to) {
      const dateFrom = new Date(filters.date_from);
      const dateTo = new Date(filters.date_to);
      qb.andWhere("debt.dateIncurred BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      });
    }

    if (filters.only_active) {
      qb.andWhere("debt.balance > 0");
    }

    const debts = await qb.getMany();
    console.log(debts)

    // Totals
    const totals = {
      totalDebt: debts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      totalBalance: debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0),
      totalPaid: debts.reduce((sum, d) => sum + (Number(d.totalPaid) || 0), 0),
      count: debts.length,
    };

    return {
      status: true,
      message: "Worker debts retrieved successfully",
      data: { debts, totals },
    };
  } catch (error) {
    console.error("Error getting debts by worker:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};