// src/ipc/debt/get/report.ipc
// @ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

// @ts-ignore
// @ts-ignore
module.exports = async (dateRange = {}, filters = {}, /** @type {any} */ userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);

    // @ts-ignore
    const { startDate, endDate } = dateRange;
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 1); // Last month

    const queryStartDate = startDate || defaultStartDate;
    const queryEndDate = endDate || new Date();

    // Base query
    const query = debtRepository.createQueryBuilder("debt")
      .leftJoinAndSelect("debt.worker", "worker")
      .leftJoinAndSelect("debt.session", "session")
      .leftJoinAndSelect("debt.histories", "history")
      .where("debt.dateIncurred BETWEEN :startDate AND :endDate", {
        startDate: queryStartDate,
        endDate: queryEndDate
      });

    // Apply filters
    // @ts-ignore
    if (filters.status) {
      // @ts-ignore
      query.andWhere("debt.status = :status", { status: filters.status });
    }

    // @ts-ignore
    if (filters.worker_id) {
      // @ts-ignore
      query.andWhere("worker.id = :worker_id", { worker_id: filters.worker_id });
    }

    query.orderBy("debt.dateIncurred", "DESC");

    const debts = await query.getMany();

    // Generate report summary
    const summary = {
      totalDebts: debts.length,
      totalAmount: debts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      totalBalance: debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0),
      totalPaid: debts.reduce((sum, d) => sum + (Number(d.totalPaid) || 0), 0),
      totalInterest: debts.reduce((sum, d) => sum + (Number(d.totalInterest) || 0), 0),

      // Group by status
      byStatus: debts.reduce((acc, debt) => {
        // @ts-ignore
        if (!acc[debt.status]) acc[debt.status] = 0;
        // @ts-ignore
        acc[debt.status] += (Number(debt.balance) || 0);
        return acc;
      }, {}),

      // Group by worker
      byWorker: debts.reduce((acc, debt) => {
        // @ts-ignore
        if (!acc[debt.worker.id]) {
          // @ts-ignore
          acc[debt.worker.id] = {
            // @ts-ignore
            workerName: debt.worker.name,
            totalDebt: 0,
            totalBalance: 0,
            count: 0
          };
        }
        // @ts-ignore
        acc[debt.worker.id].totalDebt += (Number(debt.amount) || 0);
        // @ts-ignore
        acc[debt.worker.id].totalBalance += (Number(debt.balance) || 0);
        // @ts-ignore
        acc[debt.worker.id].count++;
        return acc;
      }, {})
    };

    return {
      status: true,
      message: "Debt report generated successfully",
      data: {
        debts,
        summary,
        dateRange: {
          startDate: queryStartDate,
          endDate: queryEndDate
        }
      }
    };
  } catch (error) {
    console.error("Error generating debt report:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null
    };
  }
};