// src/ipc/pitak/get/inactive.ipc.js
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
      .where("pitak.status = :status", { status: "inactive" })
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

    // Date filters for inactivity
    // @ts-ignore
    if (filters.inactiveSince) {
      query.andWhere("pitak.updatedAt >= :inactiveSince", {
        // @ts-ignore
        inactiveSince: new Date(filters.inactiveSince),
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

    // Get historical data for each pitak
    const pitaksWithHistory = await Promise.all(
      pitaks.map(async (pitak) => {
        const assignmentRepo = AppDataSource.getRepository(Assignment);

        // Get last assignment
        const lastAssignment = await assignmentRepo.findOne({
          // @ts-ignore
          where: { pitak: { id: pitak.id } },
          order: { assignmentDate: "DESC" },
        });

        // Get assignment statistics
        const assignmentStats = await assignmentRepo
          .createQueryBuilder("assignment")
          .select([
            "COUNT(*) as totalAssignments",
            "SUM(assignment.luwangCount) as totalLuWangAssigned",
            "MAX(assignment.assignmentDate) as lastAssignmentDate",
          ])
          .where("assignment.pitakId = :pitakId", { pitakId: pitak.id })
          .getRawOne();

        // Calculate inactivity duration
        const lastActivityDate = lastAssignment
          ? lastAssignment.assignmentDate
          : pitak.updatedAt;
        const inactivityDuration = calculateDuration(
          lastActivityDate,
          new Date(),
        );

        return {
          id: pitak.id,
          location: pitak.location,
          // @ts-ignore
          totalLuwang: parseFloat(pitak.totalLuwang),
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
          history: {
            totalAssignments: parseInt(assignmentStats.totalAssignments) || 0,
            totalLuWangAssigned:
              parseFloat(assignmentStats.totalLuWangAssigned) || 0,
            lastAssignmentDate: assignmentStats.lastAssignmentDate,
            lastActivityDate,
            inactivityDuration,
          },
          createdAt: pitak.createdAt,
          updatedAt: pitak.updatedAt,
          inactiveSince: lastActivityDate,
        };
      }),
    );

    // Sort by inactivity duration if requested
    // @ts-ignore
    if (filters.sortBy === "inactivityDuration") {
      pitaksWithHistory.sort((a, b) => {
        const durationA = a.history.inactivityDuration.days;
        const durationB = b.history.inactivityDuration.days;
        // @ts-ignore
        return filters.sortOrder === "asc"
          ? durationA - durationB
          : durationB - durationA;
      });
    }

    // Calculate statistics
    const stats = pitaksWithHistory.reduce(
      (sum, pitak) => {
        sum.totalPitaks++;
        sum.totalLuWangCapacity += pitak.totalLuwang;
        sum.totalHistoricalLuWang += pitak.history.totalLuWangAssigned;
        sum.totalAssignments += pitak.history.totalAssignments;

        // Categorize by inactivity duration
        const daysInactive = pitak.history.inactivityDuration.days;
        if (daysInactive < 30) sum.recentlyInactive++;
        else if (daysInactive < 90) sum.moderatelyInactive++;
        else sum.longTermInactive++;

        return sum;
      },
      {
        totalPitaks: 0,
        totalLuWangCapacity: 0,
        totalHistoricalLuWang: 0,
        totalAssignments: 0,
        recentlyInactive: 0, // < 30 days
        moderatelyInactive: 0, // 30-90 days
        longTermInactive: 0, // > 90 days
      },
    );

    return {
      status: true,
      message: "Inactive pitaks retrieved successfully",
      data: pitaksWithHistory,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statistics: stats,
        filters,
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error retrieving inactive pitaks:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve inactive pitaks: ${error.message}`,
      data: null,
    };
  }
};

// Helper function to calculate duration
// @ts-ignore
function calculateDuration(fromDate, toDate) {
  const diffMs = toDate - fromDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  let description = "";
  if (diffYears > 0) {
    description = `${diffYears} year${diffYears > 1 ? "s" : ""}`;
  } else if (diffMonths > 0) {
    description = `${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
  } else {
    description = `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  }

  return {
    days: diffDays,
    months: diffMonths,
    years: diffYears,
    description,
  };
}
