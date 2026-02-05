// src/ipc/pitak/get/by_bukid.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const Bukid = require("../../../../entities/Bukid");
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (bukidId, filters = {}, userId) => {
  try {
    if (!bukidId) {
      return { status: false, message: "Bukid ID is required", data: null };
    }

    const bukidRepo = AppDataSource.getRepository(Bukid);
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Verify bukid exists in current session
    const bukid = await bukidRepo.findOne({
      where: {
        id: bukidId,
        // @ts-ignore
        session: { id: currentSessionId },
      },
    });

    if (!bukid) {
      return {
        status: false,
        message: "Bukid not found in current session",
        data: null,
      };
    }

    const query = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session")
      .where("pitak.bukidId = :bukidId", { bukidId })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply filters
    // @ts-ignore
    if (filters.status) {
      // @ts-ignore
      query.andWhere("pitak.status = :status", { status: filters.status });
    }

    // @ts-ignore
    if (filters.location) {
      query.andWhere("pitak.location LIKE :location", {
        // @ts-ignore
        location: `%${filters.location}%`,
      });
    }

    // @ts-ignore
    if (filters.minLuWang) {
      query.andWhere("pitak.totalLuwang >= :minLuWang", {
        // @ts-ignore
        minLuWang: filters.minLuWang,
      });
    }

    // @ts-ignore
    if (filters.maxLuWang) {
      query.andWhere("pitak.totalLuwang <= :maxLuWang", {
        // @ts-ignore
        maxLuWang: filters.maxLuWang,
      });
    }

    // Sorting
    // @ts-ignore
    const sortField = filters.sortBy || "location";
    // @ts-ignore
    const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    query.orderBy(`pitak.${sortField}`, sortOrder);

    // Get all pitaks for this bukid
    const pitaks = await query.getMany();

    // Get assignment statistics for each pitak
    const pitaksWithStats = await Promise.all(
      pitaks.map(async (pitak) => {
        const assignmentStats = await assignmentRepo
          .createQueryBuilder("assignment")
          .select([
            "COUNT(*) as totalAssignments",
            "SUM(assignment.luwangCount) as totalLuWangAssigned",
            'SUM(CASE WHEN assignment.status = "completed" THEN 1 ELSE 0 END) as completedAssignments',
            'SUM(CASE WHEN assignment.status = "active" THEN 1 ELSE 0 END) as activeAssignments',
          ])
          .where("assignment.pitakId = :pitakId", { pitakId: pitak.id })
          .getRawOne();

        return {
          id: pitak.id,
          location: pitak.location,
          // @ts-ignore
          totalLuwang: parseFloat(pitak.totalLuwang),
          status: pitak.status,
          assignmentStats: {
            total: parseInt(assignmentStats.totalAssignments) || 0,
            totalLuWangAssigned:
              parseFloat(assignmentStats.totalLuWangAssigned) || 0,
            completed: parseInt(assignmentStats.completedAssignments) || 0,
            active: parseInt(assignmentStats.activeAssignments) || 0,
          },
          utilizationRate:
            // @ts-ignore
            parseFloat(pitak.totalLuwang) > 0
              ? (parseFloat(assignmentStats.totalLuWangAssigned || 0) /
                  // @ts-ignore
                  parseFloat(pitak.totalLuwang)) *
                100
              : 0,
          createdAt: pitak.createdAt,
          updatedAt: pitak.updatedAt,
        };
      }),
    );

    // Calculate bukid-level statistics
    const bukidStats = pitaksWithStats.reduce(
      (stats, pitak) => {
        stats.totalPitaks++;
        stats.totalLuWangCapacity += pitak.totalLuwang;
        stats.totalLuWangAssigned += pitak.assignmentStats.totalLuWangAssigned;
        stats.totalAssignments += pitak.assignmentStats.total;
        stats.totalActiveAssignments += pitak.assignmentStats.active;

        if (pitak.status === "active") stats.activePitaks++;
        if (pitak.status === "inactive") stats.inactivePitaks++;
        if (pitak.status === "completed") stats.harvestedPitaks++;

        return stats;
      },
      {
        totalPitaks: 0,
        activePitaks: 0,
        inactivePitaks: 0,
        harvestedPitaks: 0,
        totalLuWangCapacity: 0,
        totalLuWangAssigned: 0,
        totalAssignments: 0,
        totalActiveAssignments: 0,
      },
    );

    // Calculate overall utilization
    // @ts-ignore
    bukidStats.utilizationRate =
      bukidStats.totalLuWangCapacity > 0
        ? (bukidStats.totalLuWangAssigned / bukidStats.totalLuWangCapacity) *
          100
        : 0;

    return {
      status: true,
      message: "Pitaks for bukid retrieved successfully",
      data: {
        bukid: {
          id: bukid.id,
          name: bukid.name,
          location: bukid.location,
        },
        pitaks: pitaksWithStats,
        statistics: bukidStats,
      },
      meta: {
        filters,
        retrievedAt: new Date(),
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error retrieving pitaks by bukid:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pitaks: ${error.message}`,
      data: null,
    };
  }
};
