// src/ipc/pitak/get/active.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Assignment = require("../../../../entities/Assignment");
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
      .where("pitak.status = :status", { status: "active" })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // Filters
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
    if (filters.minLuwang) {
      query.andWhere("pitak.totalLuwang >= :minLuwang", {
        // @ts-ignore
        minLuwang: filters.minLuwang,
      });
    }
    // @ts-ignore
    if (filters.maxLuwang) {
      query.andWhere("pitak.totalLuwang <= :maxLuwang", {
        // @ts-ignore
        maxLuwang: filters.maxLuwang,
      });
    }

    // Sorting
    // @ts-ignore
    const sortField = filters.sortBy || "totalLuwang";
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

    // Consolidated assignment stats (avoid N+1 queries)
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const assignmentStatsRaw = await assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoin("assignment.pitak", "pitak")
      .leftJoin("pitak.bukid", "bukid")
      .leftJoin("bukid.session", "session")
      .select("assignment.pitakId", "pitakId")
      .addSelect(
        "COALESCE(SUM(assignment.luwangCount),0)",
        "totalAssignedLuwang",
      )
      .addSelect("COUNT(*)", "totalAssignments")
      .where("assignment.status IN (:...statuses)", {
        statuses: ["active", "completed"],
      })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId })
      .groupBy("assignment.pitakId")
      .getRawMany();

    const statsMap = assignmentStatsRaw.reduce((acc, row) => {
      acc[row.pitakId] = {
        totalAssignedLuwang: parseFloat(row.totalAssignedLuwang) || 0,
        totalAssignments: parseInt(row.totalAssignments) || 0,
      };
      return acc;
    }, {});

    // Merge stats into pitaks
    const pitaksWithAvailability = pitaks.map((p) => {
      // @ts-ignore
      const stats = statsMap[p.id] || {
        totalAssignedLuwang: 0,
        totalAssignments: 0,
      };
      // @ts-ignore
      const totalLuWang = parseFloat(p.totalLuwang);
      const remainingLuWang = totalLuWang - stats.totalAssignedLuwang;
      const utilizationRate =
        totalLuWang > 0 ? (stats.totalAssignedLuwang / totalLuWang) * 100 : 0;

      return {
        id: p.id,
        location: p.location,
        totalLuwang: totalLuWang,
        // @ts-ignore
        bukid: p.bukid
          // @ts-ignore
          ? { id: p.bukid.id, name: p.bukid.name, location: p.bukid.location }
          : null,
        availability: {
          totalAssignedLuwang: stats.totalAssignedLuwang,
          remainingLuWang,
          utilizationRate,
          isAvailable: remainingLuWang > 0,
          assignmentCount: stats.totalAssignments,
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // Summary
    const summary = pitaksWithAvailability.reduce(
      (s, pitak) => {
        s.totalPitaks++;
        s.totalLuwangCapacity += pitak.totalLuwang;
        s.totalAssignedLuwang += pitak.availability.totalAssignedLuwang;
        s.totalRemainingLuwang += pitak.availability.remainingLuWang;
        s.availablePitaks += pitak.availability.isAvailable ? 1 : 0;
        s.totalAssignments += pitak.availability.assignmentCount;
        return s;
      },
      {
        totalPitaks: 0,
        totalLuwangCapacity: 0,
        totalAssignedLuwang: 0,
        totalRemainingLuwang: 0,
        availablePitaks: 0,
        totalAssignments: 0,
      },
    );

    // @ts-ignore
    summary.overallUtilizationRate =
      summary.totalLuwangCapacity > 0
        ? (summary.totalAssignedLuwang / summary.totalLuwangCapacity) * 100
        : 0;

    return {
      status: true,
      message: "Active pitaks retrieved successfully",
      data: pitaksWithAvailability,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary,
        filters,
      },
    };
  } catch (error) {
    console.error("Error retrieving active pitaks:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve active pitaks: ${error.message}`,
      data: null,
    };
  }
};
