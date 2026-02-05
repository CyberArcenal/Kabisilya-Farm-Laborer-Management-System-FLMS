// src/ipc/debt/get/by_id.ipc
//@ts-check
const Debt = require("../../../../entities/Debt");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get a debt by ID
 * @param {number} debtId
 * @param {number} [userId]
 */
module.exports = async (debtId, userId) => {
  try {
    const debtRepository = AppDataSource.getRepository(Debt);

    const debt = await debtRepository.findOne({
      where: { id: debtId },
      relations: ["worker", "history", "history.payment", "session"],
    });

    if (!debt) {
      return {
        status: false,
        message: "Debt not found",
        data: null,
      };
    }

    return {
      status: true,
      message: "Debt retrieved successfully",
      data: debt,
    };
  } catch (error) {
    console.error("Error getting debt by ID:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message,
      data: null,
    };
  }
};