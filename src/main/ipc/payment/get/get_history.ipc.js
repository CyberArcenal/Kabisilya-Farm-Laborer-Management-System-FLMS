// ipc/payment/get_history.ipc.js
//@ts-check

const PaymentHistory = require("../../../../entities/PaymentHistory");
const { AppDataSource } = require("../../../db/dataSource");

module.exports = async function getPaymentHistory(params = {}) {
  try {
    // @ts-ignore
    let { paymentId, actionType, startDate, endDate, limit = 100, page = 1 } = params;

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 100);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const historyRepository = AppDataSource.getRepository(PaymentHistory);

    // Base query with worker and session relations
    const queryBuilder = historyRepository
      .createQueryBuilder("history")
      .leftJoinAndSelect("history.payment", "payment")
      .leftJoinAndSelect("payment.worker", "worker")
      .leftJoinAndSelect("payment.session", "session"); // Added session

    // Apply filters
    if (paymentId) {
      paymentId = parseInt(paymentId, 10);
      if (!Number.isNaN(paymentId) && paymentId > 0) {
        queryBuilder.where("payment.id = :paymentId", { paymentId });
      }
    }

    if (actionType) {
      queryBuilder.andWhere("history.actionType = :actionType", { actionType });
    }

    if (startDate) {
      queryBuilder.andWhere("history.changeDate >= :startDate", { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere("history.changeDate <= :endDate", { endDate: new Date(endDate) });
    }

    queryBuilder.orderBy("history.changeDate", "DESC");

    // total count with same filters
    const total = await queryBuilder.getCount();

    // Get paginated results
    const history = await queryBuilder.skip(skip).take(parsedLimit).getMany();

    // Format history for display
    const formattedHistory = history.map((record) => ({
      id: record.id,
      // @ts-ignore
      timestamp: record.changeDate ? new Date(record.changeDate).toISOString() : null,
      action: record.actionType,
      field: record.changedField,
      changes: {
        oldValue: record.oldValue ?? null,
        newValue: record.newValue ?? null,
        // @ts-ignore
        oldAmount: record.oldAmount != null ? parseFloat(record.oldAmount) : null,
        // @ts-ignore
        newAmount: record.newAmount != null ? parseFloat(record.newAmount) : null,
      },
      performedBy: record.performedBy ?? null,
      notes: record.notes ?? null,
      // Include worker data
      // @ts-ignore
      worker: record.payment?.worker ? {
        // @ts-ignore
        id: record.payment.worker.id,
        // @ts-ignore
        name: record.payment.worker.name,
        // @ts-ignore
        contact: record.payment.worker.contact,
      } : null,
      // Include session data
      // @ts-ignore
      session: record.payment?.session ? {
        // @ts-ignore
        id: record.payment.session.id,
        // @ts-ignore
        name: record.payment.session.name,
        // @ts-ignore
        year: record.payment.session.year,
      } : null,
      // @ts-ignore
      paymentInfo: record.payment ? {
        // @ts-ignore
        id: record.payment.id,
        // @ts-ignore
        referenceNumber: record.payment.referenceNumber,
        // @ts-ignore
        status: record.payment.status,
        // @ts-ignore
        netPay: parseFloat(record.payment.netPay || 0),
      } : null,
    }));

    // Activity summary
    const activitySummaryQB = historyRepository
      .createQueryBuilder("history")
      .select(["history.actionType as action_type", "COUNT(history.id) as count"])
      .leftJoin("history.payment", "payment");

    if (paymentId) {
      activitySummaryQB.where("payment.id = :paymentId", { paymentId });
    }
    if (actionType) activitySummaryQB.andWhere("history.actionType = :actionType", { actionType });
    if (startDate) activitySummaryQB.andWhere("history.changeDate >= :startDate", { startDate: new Date(startDate) });
    if (endDate) activitySummaryQB.andWhere("history.changeDate <= :endDate", { endDate: new Date(endDate) });

    activitySummaryQB.groupBy("history.actionType");
    const activitySummaryRaw = await activitySummaryQB.getRawMany();

    const activitySummary = (activitySummaryRaw || []).map((r) => ({
      actionType: r.action_type,
      count: parseInt(r.count || 0, 10),
    }));

    return {
      status: true,
      message: "Payment history retrieved successfully",
      data: {
        history: formattedHistory,
        summary: {
          totalRecords: total,
          activitySummary,
          firstChange:
            history.length > 0
              ? history[history.length - 1].changeDate
                // @ts-ignore
                ? new Date(history[history.length - 1].changeDate).toISOString()
                : null
              : null,
          lastChange:
            history.length > 0
              ? history[0].changeDate
                // @ts-ignore
                ? new Date(history[0].changeDate).toISOString()
                : null
              : null,
        },
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      },
    };
  } catch (error) {
    console.error("Error in getPaymentHistory:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve payment history: ${error.message}`,
      data: null,
    };
  }
};