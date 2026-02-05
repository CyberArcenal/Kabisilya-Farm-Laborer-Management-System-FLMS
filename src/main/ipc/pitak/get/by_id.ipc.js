// src/ipc/pitak/get/by_id.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (id, userId) => {
  try {
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const currentSessionId = await farmSessionDefaultSessionId();

    const pitak = await pitakRepo.findOne({
      where: {
        id,
        // @ts-ignore
        bukid: { session: { id: currentSessionId } },
      },
      relations: [
        "bukid",
        "bukid.session",
        "assignments",
        "assignments.worker",
        "payments",
      ],
    });

    if (!pitak) {
      return {
        status: false,
        message: "Pitak not found in current session",
        data: null,
      };
    }

    // Repositories
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const paymentRepo = AppDataSource.getRepository(Payment);

    // Recent assignments
    const recentAssignments = await assignmentRepo.find({
      // @ts-ignore
      where: { pitak: { id } },
      relations: ["worker"],
      order: { assignmentDate: "DESC" },
      take: 10,
    });

    // Recent payments
    const recentPayments = await paymentRepo.find({
      // @ts-ignore
      where: { pitak: { id } },
      relations: ["worker"],
      order: { paymentDate: "DESC" },
      take: 10,
    });

    // Helper: safe parse float
    // @ts-ignore
    const safeParseFloat = (v) => {
      if (v === null || v === undefined) return 0;
      const n = parseFloat(v);
      return Number.isNaN(n) ? 0 : n;
    };

    // Assignment stats
    const assignmentStatsRaw = await assignmentRepo
      .createQueryBuilder("assignment")
      .innerJoin("assignment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .select([
        "COUNT(*) as totalAssignments",
        "SUM(assignment.luwangCount) as totalLuWangAssigned",
        "AVG(assignment.luwangCount) as averageLuWangPerAssignment",
        "SUM(CASE WHEN assignment.status = 'completed' THEN 1 ELSE 0 END) as completedAssignments",
        "SUM(CASE WHEN assignment.status = 'active' THEN 1 ELSE 0 END) as activeAssignments",
      ])
      .where("pitak.id = :pitakId", { pitakId: id })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .getRawOne();

    // Payment stats
    const paymentStatsRaw = await paymentRepo
      .createQueryBuilder("payment")
      .innerJoin("payment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .select([
        "COUNT(*) as totalPayments",
        "SUM(payment.grossPay) as totalGrossPay",
        "SUM(payment.netPay) as totalNetPay",
        "AVG(payment.grossPay) as averageGrossPay",
        "SUM(CASE WHEN payment.status = 'completed' THEN 1 ELSE 0 END) as completedPayments",
      ])
      .where("pitak.id = :pitakId", { pitakId: id })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .getRawOne();

    // Normalize stats safely
    const assignmentStats = {
      totalAssignments:
        parseInt(assignmentStatsRaw?.totalAssignments || 0, 10) || 0,
      totalLuWangAssigned: safeParseFloat(
        assignmentStatsRaw?.totalLuWangAssigned,
      ),
      averageLuWangPerAssignment: safeParseFloat(
        assignmentStatsRaw?.averageLuWangPerAssignment,
      ),
      completedAssignments:
        parseInt(assignmentStatsRaw?.completedAssignments || 0, 10) || 0,
      activeAssignments:
        parseInt(assignmentStatsRaw?.activeAssignments || 0, 10) || 0,
    };

    const paymentStats = {
      totalPayments: parseInt(paymentStatsRaw?.totalPayments || 0, 10) || 0,
      totalGrossPay: safeParseFloat(paymentStatsRaw?.totalGrossPay),
      totalNetPay: safeParseFloat(paymentStatsRaw?.totalNetPay),
      averageGrossPay: safeParseFloat(paymentStatsRaw?.averageGrossPay),
      completedPayments:
        parseInt(paymentStatsRaw?.completedPayments || 0, 10) || 0,
    };

    // Format recent assignments/payments for frontend
    // @ts-ignore
    const formatDateToYMD = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString().split("T")[0];
    };

    const formattedRecentAssignments = recentAssignments.map((a) => ({
      id: a.id,
      assignmentDate: formatDateToYMD(a.assignmentDate),
      luwangCount: safeParseFloat(a.luwangCount),
      status: a.status,
      // @ts-ignore
      worker: a.worker ? { id: a.worker.id, name: a.worker.name } : null,
    }));

    const formattedRecentPayments = recentPayments.map((p) => ({
      id: p.id,
      paymentDate: formatDateToYMD(p.paymentDate),
      grossPay: safeParseFloat(p.grossPay),
      netPay: safeParseFloat(p.netPay),
      status: p.status,
      // @ts-ignore
      worker: p.worker ? { id: p.worker.id, name: p.worker.name } : null,
    }));

    // Normalize pitak.totalLuwang
    const totalLuwang = safeParseFloat(pitak.totalLuwang);

    return {
      status: true,
      message: "Pitak retrieved successfully",
      data: {
        id: pitak.id,
        location: pitak.location,
        totalLuwang,
        status: pitak.status,
        // @ts-ignore
        bukid: pitak.bukid
          ? {
              // @ts-ignore
              id: pitak.bukid.id,
              // @ts-ignore
              name: pitak.bukid.name,
              // @ts-ignore
              location: pitak.bukid.location,
            }
          : null,
        stats: {
          assignments: {
            total: assignmentStats.totalAssignments,
            totalLuWangAssigned: assignmentStats.totalLuWangAssigned,
            averageLuWangPerAssignment:
              assignmentStats.averageLuWangPerAssignment,
            completed: assignmentStats.completedAssignments,
            active: assignmentStats.activeAssignments,
          },
          payments: {
            total: paymentStats.totalPayments,
            totalGrossPay: paymentStats.totalGrossPay,
            totalNetPay: paymentStats.totalNetPay,
            averageGrossPay: paymentStats.averageGrossPay,
            completed: paymentStats.completedPayments,
          },
        },
        recentAssignments: formattedRecentAssignments,
        recentPayments: formattedRecentPayments,
        createdAt: pitak.createdAt
          // @ts-ignore
          ? new Date(pitak.createdAt).toISOString()
          : undefined,
        updatedAt: pitak.updatedAt
          // @ts-ignore
          ? new Date(pitak.updatedAt).toISOString()
          : undefined,
      },
    };
  } catch (error) {
    console.error("Error retrieving pitak:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pitak: ${error?.message || error}`,
      data: null,
    };
  }
};
