// src/ipc/debt/get/active.ipc
//@ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get active debts with optional filters
 * @param {{ workerId?: number; due_soon?: boolean }} filters
 * @param {number} [userId]
 */
module.exports = async (filters = {}, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);

    const qb = debtRepository
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .where("debt.balance > 0")
      .andWhere("debt.status NOT IN (:...statuses)", {
        statuses: ["paid", "cancelled"],
      })
      .orderBy("debt.dueDate", "ASC");

    // Filter by worker
    if (filters.workerId) {
      qb.andWhere("debt.worker = :workerId", { workerId: filters.workerId });
    }

    // Filter by due soon (within 1 day)
    if (filters.due_soon) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      qb.andWhere("debt.dueDate <= :dueDate", { dueDate: tomorrow });
    }

    const debts = await qb.getMany();

    return {
      status: true,
      message: "Active debts retrieved successfully",
      data: debts,
    };
  } catch (error) {
    console.error("Error getting active debts:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};