// src/main/ipc/assignment/update_status.ipc


const assignmentService = require("../../../../services/Assignment");

module.exports = async (params, queryRunner) => {
  try {
    const { id, status, userId } = params;
    if (!id) throw new Error("Assignment ID is required");
    if (!status) throw new Error("New status is required");

    const updated = await assignmentService.updateStatus(id, status, userId || "system", queryRunner);
    return {
      status: true,
      message: "Assignment status updated successfully",
      data: updated,
    };
  } catch (error) {
    return {
      status: false,
      message: error.message,
      data: null,
    };
  }
};