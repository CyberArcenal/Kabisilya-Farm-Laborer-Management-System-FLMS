// src/ipc/pitak/get/completed.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
const Payment = require("../../../../entities/Payment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (filters = {}, userId) => {
  try {
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const currentSessionId = await farmSessionDefaultSessionId();

    const query = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session")
      .where("pitak.status = :status", { status: "completed" })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply additional filters
    // @ts-ignore
    if (filters.bukidId) {
      // @ts-ignore
      query.andWhere("pitak.bukidId = :bukidId", { bukidId: filters.bukidId });
    }

    // @ts-ignore
    if (filters.location) {
      query.andWhere("pitak.location LIKE :location", {
        // @ts-ignore
        location: `%${filters.location}%`,
      });
    }

    // @ts-ignore
    if (filters.harvestedAfter) {
      query.andWhere("pitak.updatedAt >= :harvestedAfter", {
        // @ts-ignore
        harvestedAfter: new Date(filters.harvestedAfter),
      });
    }

    // @ts-ignore
    if (filters.harvestedBefore) {
      query.andWhere("pitak.updatedAt <= :harvestedBefore", {
        // @ts-ignore
        harvestedBefore: new Date(filters.harvestedBefore),
      });
    }

    // Sorting
    // @ts-ignore
    const sortField = filters.sortBy || "updatedAt";
    // @ts-ignore
    const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    query.orderBy(`pitak.${sortField}`, sortOrder);

    // Pagination
    // @ts-ignore
    const page = parseInt(filters.page) || 1;
    // @ts-ignore
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    const [pitaks, total] = await query.getManyAndCount();

    // Get comprehensive harvest data for each pitak
    const harvestedPitaks = await Promise.all(
      pitaks.map(async (pitak) => {
        const assignmentRepo = AppDataSource.getRepository(Assignment);
        const paymentRepo = AppDataSource.getRepository(Payment);

        // Get assignment statistics
        const assignmentStats = await assignmentRepo
          .createQueryBuilder("assignment")
          .select([
            "COUNT(*) as totalAssignments",
            "SUM(assignment.luwangCount) as totalLuWangAssigned",
            "MIN(assignment.assignmentDate) as firstAssignment",
            "MAX(assignment.assignmentDate) as lastAssignment",
          ])
          .where("assignment.pitakId = :pitakId", { pitakId: pitak.id })
          .getRawOne();

        // Get payment statistics
        const paymentStats = await paymentRepo
          .createQueryBuilder("payment")
          .select([
            "COUNT(*) as totalPayments",
            "SUM(payment.grossPay) as totalGrossPay",
            "SUM(payment.netPay) as totalNetPay",
            "SUM(payment.totalDebtDeduction) as totalDebtDeduction",
          ])
          .where("payment.pitakId = :pitakId", { pitakId: pitak.id })
          .getRawOne();

        // Calculate harvest metrics
        const totalLuWangAssigned =
          parseFloat(assignmentStats.totalLuWangAssigned) || 0;
        // @ts-ignore
        const totalLuWangCapacity = parseFloat(pitak.totalLuwang);
        const utilizationRate =
          totalLuWangCapacity > 0
            ? (totalLuWangAssigned / totalLuWangCapacity) * 100
            : 0;

        // Calculate harvest efficiency
        const totalNetPay = parseFloat(paymentStats.totalNetPay) || 0;
        const revenuePerLuWang =
          totalLuWangAssigned > 0 ? totalNetPay / totalLuWangAssigned : 0;

        // Calculate harvest duration
        const firstAssignment = assignmentStats.firstAssignment;
        const lastAssignment = assignmentStats.lastAssignment;
        let harvestDuration = null;

        if (firstAssignment && lastAssignment) {
          const start = new Date(firstAssignment);
          const end = new Date(lastAssignment);
          // @ts-ignore
          const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          harvestDuration = {
            days: diffDays,
            start: start,
            end: end,
          };
        }

        return {
          id: pitak.id,
          location: pitak.location,
          totalLuWangCapacity,
          // @ts-ignore
          bukid: pitak.bukid
            ? {
                // @ts-ignore
                id: pitak.bukid.id,
                // @ts-ignore
                name: pitak.bukid.name,
                // @ts-ignore
                location: pitak.bukid.location,
                // @ts-ignore
                kabisilya: pitak.bukid.kabisilya,
              }
            : null,
          harvestData: {
            harvestedAt: pitak.updatedAt,
            totalAssignments: parseInt(assignmentStats.totalAssignments) || 0,
            totalLuWangAssigned,
            utilizationRate,
            totalPayments: parseInt(paymentStats.totalPayments) || 0,
            totalGrossPay: parseFloat(paymentStats.totalGrossPay) || 0,
            totalNetPay,
            totalDebtDeduction:
              parseFloat(paymentStats.totalDebtDeduction) || 0,
            revenuePerLuWang,
            harvestDuration,
            firstAssignment: assignmentStats.firstAssignment,
            lastAssignment: assignmentStats.lastAssignment,
          },
          createdAt: pitak.createdAt,
          updatedAt: pitak.updatedAt,
        };
      }),
    );

    // Calculate harvest summary statistics
    const summary = harvestedPitaks.reduce(
      (stats, pitak) => {
        stats.totalPitaks++;
        stats.totalLuWangCapacity += pitak.totalLuWangCapacity;
        stats.totalLuWangHarvested += pitak.harvestData.totalLuWangAssigned;
        stats.totalGrossRevenue += pitak.harvestData.totalGrossPay;
        stats.totalNetRevenue += pitak.harvestData.totalNetPay;
        stats.totalAssignments += pitak.harvestData.totalAssignments;
        stats.totalPayments += pitak.harvestData.totalPayments;

        // Calculate average metrics
        stats.averageUtilization += pitak.harvestData.utilizationRate;
        stats.averageRevenuePerLuWang += pitak.harvestData.revenuePerLuWang;

        // Track best performing pitak
        if (pitak.harvestData.revenuePerLuWang > stats.bestRevenuePerLuWang) {
          stats.bestRevenuePerLuWang = pitak.harvestData.revenuePerLuWang;
          // @ts-ignore
          stats.bestPerformingPitakId = pitak.id;
        }

        // Track highest utilization
        if (pitak.harvestData.utilizationRate > stats.highestUtilization) {
          stats.highestUtilization = pitak.harvestData.utilizationRate;
          // @ts-ignore
          stats.mostUtilizedPitakId = pitak.id;
        }

        return stats;
      },
      {
        totalPitaks: 0,
        totalLuWangCapacity: 0,
        totalLuWangHarvested: 0,
        totalGrossRevenue: 0,
        totalNetRevenue: 0,
        totalAssignments: 0,
        totalPayments: 0,
        averageUtilization: 0,
        averageRevenuePerLuWang: 0,
        bestRevenuePerLuWang: 0,
        bestPerformingPitakId: null,
        highestUtilization: 0,
        mostUtilizedPitakId: null,
      },
    );

    // Calculate averages
    if (summary.totalPitaks > 0) {
      summary.averageUtilization =
        summary.averageUtilization / summary.totalPitaks;
      summary.averageRevenuePerLuWang =
        summary.averageRevenuePerLuWang / summary.totalPitaks;
    }

    // Calculate overall harvest efficiency
    // @ts-ignore
    summary.overallHarvestEfficiency =
      summary.totalLuWangHarvested > 0
        ? summary.totalNetRevenue / summary.totalLuWangHarvested
        : 0;

    return {
      status: true,
      message: "Completed pitaks retrieved successfully",
      data: harvestedPitaks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary,
        filters,
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error retrieving completed pitaks:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve completed pitaks: ${error.message}`,
      data: null,
    };
  }
};
