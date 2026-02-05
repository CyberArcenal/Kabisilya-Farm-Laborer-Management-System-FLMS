// src/ipc/debt/get/all.ipc
//@ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get all debts with optional filters
 * @param {{ status?: string; workerId?: number; date_from?: string|Date; date_to?: string|Date }} filters
 * @param {number} [userId]
 */
module.exports = async (filters = {}, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);

    const qb = debtRepository
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .leftJoinAndSelect("debt.history", "history")
      .orderBy("debt.dateIncurred", "DESC");

    // Filter by status
    if (filters.status) {
      qb.andWhere("debt.status = :status", { status: filters.status });
    }

    // Filter by worker
    if (filters.workerId) {
      qb.andWhere("debt.worker = :workerId", { workerId: filters.workerId });
    }

    // Filter by date range
    if (filters.date_from && filters.date_to) {
      const dateFrom = new Date(filters.date_from);
      const dateTo = new Date(filters.date_to);
      qb.andWhere("debt.dateIncurred BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      });
    }

    const debts = await qb.getMany();

    return {
      status: true,
      message: "Debts retrieved successfully",
      data: debts,
    };
  } catch (error) {
    console.error("Error getting all debts:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};