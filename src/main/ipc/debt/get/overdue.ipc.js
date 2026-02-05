// src/ipc/debt/get/overdue.ipc
//@ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get overdue debts with optional filters
 * @param {{ workerId?: number }} filters
 * @param {number} [userId]
 */
module.exports = async (filters = {}, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);
    const today = new Date();

    const qb = debtRepository
      .createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .where("debt.balance > 0")
      .andWhere("debt.dueDate < :today", { today })
      .andWhere("debt.status NOT IN (:...statuses)", {
        statuses: ["paid", "cancelled"],
      })
      .orderBy("debt.dueDate", "ASC");

    // Filter by worker
    if (filters.workerId) {
      qb.andWhere("debt.worker = :workerId", { workerId: filters.workerId });
    }

    const debts = await qb.getMany();

    // Calculate overdue days
    const debtsWithOverdueDays = debts.map((debt) => {
      // @ts-ignore
      const dueDate = new Date(debt.dueDate);
      // @ts-ignore
      const overdueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      return {
        ...debt,
        overdueDays: overdueDays > 0 ? overdueDays : 0,
      };
    });

    return {
      status: true,
      message: "Overdue debts retrieved successfully",
      data: debtsWithOverdueDays,
    };
  } catch (error) {
    console.error("Error getting overdue debts:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};