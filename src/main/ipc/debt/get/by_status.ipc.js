// src/ipc/debt/get/by_status.ipc
//@ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get debts by status with optional filters
 * @param {string} status
 * @param {{ workerId?: number; date_from?: string|Date; date_to?: string|Date }} filters
 * @param {number} [userId]
 */
module.exports = async (status, filters = {}, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);

    const qb = debtRepository
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .where("debt.status = :status", { status })
      .orderBy("debt.dateIncurred", "DESC");

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
      message: `Debts with status '${status}' retrieved successfully`,
      data: debts,
    };
  } catch (error) {
    console.error("Error getting debts by status:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};