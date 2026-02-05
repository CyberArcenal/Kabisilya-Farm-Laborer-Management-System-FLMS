// src/ipc/pitak/get/summary.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (bukidId, status, userId) => {
  try {
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Build base query with session filter
    const query = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session")
      .where("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply filters
    if (bukidId) {
      query.andWhere("pitak.bukidId = :bukidId", { bukidId });
    }

    if (status) {
      query.andWhere("pitak.status = :status", { status });
    }

    const pitaks = await query.getMany();

    if (pitaks.length === 0) {
      return {
        status: true,
        message: "No pitaks found for the given criteria",
        data: {
          summary: {
            totalPitaks: 0,
            totalLuWangCapacity: 0,
            activePitaks: 0,
            inactivePitaks: 0,
            harvestedPitaks: 0,
            averageLuWang: 0,
            totalAssignments: 0,
            totalLuWangAssigned: 0,
            totalPayments: 0,
            totalRevenue: 0,
            averageUtilization: 0,
          },
          pitaks: [],
          period: {
            generatedAt: new Date().toISOString(),
          },
        },
      };
    }

    // Get assignment statistics for all pitaks with session filter
    const pitakIds = pitaks.map((p) => p.id);

    const assignmentStats = await assignmentRepo
      .createQueryBuilder("assignment")
      .innerJoin("assignment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .select([
        "assignment.pitakId as pitakId",
        "COUNT(*) as assignmentCount",
        "SUM(assignment.luwangCount) as totalLuWangAssigned",
        'SUM(CASE WHEN assignment.status = "completed" THEN 1 ELSE 0 END) as completedAssignments',
      ])
      .where("assignment.pitakId IN (:...pitakIds)", { pitakIds })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .groupBy("assignment.pitakId")
      .getRawMany();

    // Get payment statistics for all pitaks with session filter
    const paymentStats = await paymentRepo
      .createQueryBuilder("payment")
      .innerJoin("payment.pitak", "pitak")
      .innerJoin("pitak.bukid", "bukid")
      .innerJoin("bukid.session", "session")
      .select([
        "payment.pitakId as pitakId",
        "COUNT(*) as paymentCount",
        "SUM(payment.netPay) as totalNetPay",
        "SUM(payment.grossPay) as totalGrossPay",
      ])
      .where("payment.pitakId IN (:...pitakIds)", { pitakIds })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .groupBy("payment.pitakId")
      .getRawMany();

    // Create maps for quick lookup
    const assignmentMap = new Map();
    assignmentStats.forEach((stat) => {
      assignmentMap.set(stat.pitakId, {
        assignmentCount: parseInt(stat.assignmentCount) || 0,
        totalLuWangAssigned: parseFloat(stat.totalLuWangAssigned) || 0,
        completedAssignments: parseInt(stat.completedAssignments) || 0,
      });
    });

    const paymentMap = new Map();
    paymentStats.forEach((stat) => {
      paymentMap.set(stat.pitakId, {
        paymentCount: parseInt(stat.paymentCount) || 0,
        totalNetPay: parseFloat(stat.totalNetPay) || 0,
        totalGrossPay: parseFloat(stat.totalGrossPay) || 0,
      });
    });

    // Build detailed pitak summary
    const detailedPitaks = pitaks.map((pitak) => {
      const assignments = assignmentMap.get(pitak.id) || {
        assignmentCount: 0,
        totalLuWangAssigned: 0,
        completedAssignments: 0,
      };

      const payments = paymentMap.get(pitak.id) || {
        paymentCount: 0,
        totalNetPay: 0,
        totalGrossPay: 0,
      };

      // @ts-ignore
      const totalLuWangCapacity = parseFloat(pitak.totalLuwang);
      const utilizationRate =
        totalLuWangCapacity > 0
          ? (assignments.totalLuWangAssigned / totalLuWangCapacity) * 100
          : 0;

      return {
        id: pitak.id,
        location: pitak.location,
        status: pitak.status,
        totalLuWangCapacity,
        // @ts-ignore
        bukid: pitak.bukid
          ? {
              // @ts-ignore
              id: pitak.bukid.id,
              // @ts-ignore
              name: pitak.bukid.name,
            }
          : null,
        assignments: {
          total: assignments.assignmentCount,
          totalLuWangAssigned: assignments.totalLuWangAssigned,
          completed: assignments.completedAssignments,
          pending:
            assignments.assignmentCount - assignments.completedAssignments,
        },
        payments: {
          total: payments.paymentCount,
          totalNetPay: payments.totalNetPay,
          totalGrossPay: payments.totalGrossPay,
          averageNetPay:
            payments.paymentCount > 0
              ? payments.totalNetPay / payments.paymentCount
              : 0,
        },
        utilization: {
          rate: utilizationRate,
          capacityUsed: assignments.totalLuWangAssigned,
          capacityRemaining:
            totalLuWangCapacity - assignments.totalLuWangAssigned,
        },
        efficiency: {
          revenuePerLuWang:
            assignments.totalLuWangAssigned > 0
              ? payments.totalNetPay / assignments.totalLuWangAssigned
              : 0,
          assignmentsPerPayment:
            payments.paymentCount > 0
              ? assignments.assignmentCount / payments.paymentCount
              : 0,
        },
      };
    });

    // Calculate overall summary
    const summary = detailedPitaks.reduce(
      (acc, pitak) => {
        acc.totalPitaks++;
        acc.totalLuWangCapacity += pitak.totalLuWangCapacity;
        acc.totalLuWangAssigned += pitak.assignments.totalLuWangAssigned;
        acc.totalAssignments += pitak.assignments.total;
        acc.totalPayments += pitak.payments.total;
        acc.totalRevenue += pitak.payments.totalNetPay;

        if (pitak.status === "active") acc.activePitaks++;
        if (pitak.status === "inactive") acc.inactivePitaks++;
        if (pitak.status === "completed") acc.harvestedPitaks++;

        return acc;
      },
      {
        totalPitaks: 0,
        totalLuWangCapacity: 0,
        totalLuWangAssigned: 0,
        activePitaks: 0,
        inactivePitaks: 0,
        harvestedPitaks: 0,
        totalAssignments: 0,
        totalPayments: 0,
        totalRevenue: 0,
      },
    );

    // Calculate averages
    // @ts-ignore
    summary.averageLuWang =
      summary.totalPitaks > 0
        ? summary.totalLuWangCapacity / summary.totalPitaks
        : 0;
    // @ts-ignore
    summary.averageUtilization =
      summary.totalLuWangCapacity > 0
        ? (summary.totalLuWangAssigned / summary.totalLuWangCapacity) * 100
        : 0;
    // @ts-ignore
    summary.averageRevenuePerPitak =
      summary.totalPitaks > 0 ? summary.totalRevenue / summary.totalPitaks : 0;

    // Group by bukid
    const bukidGroups = {};
    detailedPitaks.forEach((pitak) => {
      const bukidName = pitak.bukid ? pitak.bukid.name : "Unknown";
      // @ts-ignore
      if (!bukidGroups[bukidName]) {
        // @ts-ignore
        bukidGroups[bukidName] = {
          bukidName,
          pitakCount: 0,
          totalLuWangCapacity: 0,
          totalLuWangAssigned: 0,
          totalRevenue: 0,
          pitaks: [],
        };
      }

      // @ts-ignore
      bukidGroups[bukidName].pitakCount++;
      // @ts-ignore
      bukidGroups[bukidName].totalLuWangCapacity += pitak.totalLuWangCapacity;
      // @ts-ignore
      bukidGroups[bukidName].totalLuWangAssigned +=
        pitak.assignments.totalLuWangAssigned;
      // @ts-ignore
      bukidGroups[bukidName].totalRevenue += pitak.payments.totalNetPay;
      // @ts-ignore
      bukidGroups[bukidName].pitaks.push({
        id: pitak.id,
        location: pitak.location,
        status: pitak.status,
        utilizationRate: pitak.utilization.rate,
      });
    });

    // Convert to array and calculate utilization for each bukid
    const bukidSummaries = Object.values(bukidGroups).map((group) => ({
      ...group,
      utilizationRate:
        group.totalLuWangCapacity > 0
          ? (group.totalLuWangAssigned / group.totalLuWangCapacity) * 100
          : 0,
      averageRevenuePerPitak:
        group.pitakCount > 0 ? group.totalRevenue / group.pitakCount : 0,
    }));

    // Sort by total revenue
    bukidSummaries.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      status: true,
      message: "Pitak summary retrieved successfully",
      data: {
        summary,
        detailedPitaks,
        bukidSummaries,
        filters: {
          bukidId: bukidId || "All",
          status: status || "All",
        },
        period: {
          generatedAt: new Date().toISOString(),
        },
      },
      meta: {
        totalPitaks: pitaks.length,
        totalBukids: Object.keys(bukidGroups).length,
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error retrieving pitak summary:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pitak summary: ${error.message}`,
      data: null,
    };
  }
};
