// src/ipc/debt/get/history.ipc
//@ts-check
const DebtHistory = require("../../../../entities/DebtHistory");
const { AppDataSource } = require("../../../db/dataSource");

// @ts-ignore
module.exports = async (debtId, userId) => {
  try {
    const debtHistoryRepository = AppDataSource.getRepository(DebtHistory);
    
    // Fetch history with all necessary relations including worker
    const history = await debtHistoryRepository.find({
      // @ts-ignore
      where: { debt: { id: debtId } },
      relations: [
        "debt", 
        "debt.worker", // Get worker through debt relation
        "payment",
        "payment.worker", // Also get worker through payment if exists
      ],
      order: { transactionDate: "DESC" }
    });

    // Format the response to include worker data
    const formattedHistory = history.map(record => ({
      id: record.id,
      // @ts-ignore
      amountPaid: parseFloat(record.amountPaid || 0),
      // @ts-ignore
      previousBalance: parseFloat(record.previousBalance || 0),
      // @ts-ignore
      newBalance: parseFloat(record.newBalance || 0),
      transactionType: record.transactionType,
      paymentMethod: record.paymentMethod,
      referenceNumber: record.referenceNumber,
      notes: record.notes,
      transactionDate: record.transactionDate,
      createdAt: record.createdAt,
      
      // Worker data from debt (primary source)
      // @ts-ignore
      worker: record.debt?.worker ? {
        // @ts-ignore
        id: record.debt.worker.id,
        // @ts-ignore
        name: record.debt.worker.name,
        // @ts-ignore
        contact: record.debt.worker.contact,
        // Add other worker fields as needed
      } : null,
      
      // Debt info
      // @ts-ignore
      debt: record.debt ? {
        // @ts-ignore
        id: record.debt.id,
        // @ts-ignore
        originalAmount: parseFloat(record.debt.originalAmount || 0),
        // @ts-ignore
        amount: parseFloat(record.debt.amount || 0),
        // @ts-ignore
        reason: record.debt.reason,
        // @ts-ignore
        status: record.debt.status,
      } : null,
      
      // Payment info with worker if exists
      // @ts-ignore
      payment: record.payment ? {
        // @ts-ignore
        id: record.payment.id,
        // @ts-ignore
        referenceNumber: record.payment.referenceNumber,
        // @ts-ignore
        status: record.payment.status,
        // @ts-ignore
        netPay: parseFloat(record.payment.netPay || 0),
        // Include worker from payment if different (though usually same)
        // @ts-ignore
        paymentWorker: record.payment?.worker ? {
          // @ts-ignore
          id: record.payment.worker.id,
          // @ts-ignore
          firstName: record.payment.worker.firstName,
          // @ts-ignore
          lastName: record.payment.worker.lastName,
        } : null,
      } : null,
    }));

    return {
      status: true,
      message: "Debt history retrieved successfully",
      data: {
        history: formattedHistory,
        summary: {
          totalRecords: history.length,
          totalPaid: formattedHistory.reduce((sum, item) => sum + item.amountPaid, 0),
          transactionTypes: [...new Set(formattedHistory.map(item => item.transactionType))],
        }
      }
    };
  } catch (error) {
    console.error("Error getting debt history:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null
    };
  }
};