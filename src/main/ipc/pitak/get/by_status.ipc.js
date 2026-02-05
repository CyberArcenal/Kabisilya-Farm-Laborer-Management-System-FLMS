// src/ipc/pitak/get/by_status.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (status, filters = {}, userId) => {
  try {
    const validStatuses = ["active", "inactive", "completed"];
    if (!validStatuses.includes(status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        data: null,
      };
    }

    const pitakRepo = AppDataSource.getRepository(Pitak);
    const currentSessionId = await farmSessionDefaultSessionId();

    const query = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoinAndSelect("pitak.bukid", "bukid")
      .leftJoinAndSelect("bukid.session", "session")
      .where("pitak.status = :status", { status })
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

    // Date filters
    // @ts-ignore
    if (filters.createdAfter) {
      query.andWhere("pitak.createdAt >= :createdAfter", {
        // @ts-ignore
        createdAfter: new Date(filters.createdAfter),
      });
    }

    // @ts-ignore
    if (filters.createdBefore) {
      query.andWhere("pitak.createdAt <= :createdBefore", {
        // @ts-ignore
        createdBefore: new Date(filters.createdBefore),
      });
    }

    // Sorting
    // @ts-ignore
    const sortField = filters.sortBy || "createdAt";
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

    // Calculate statistics for this status
    const statsQuery = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoin("pitak.bukid", "bukid")
      .leftJoin("bukid.session", "session")
      .select([
        "COUNT(*) as total",
        "SUM(pitak.totalLuwang) as totalLuWang",
        "AVG(pitak.totalLuwang) as averageLuWang",
        "MIN(pitak.totalLuwang) as minLuWang",
        "MAX(pitak.totalLuwang) as maxLuWang",
        "MIN(pitak.createdAt) as oldest",
        "MAX(pitak.createdAt) as newest",
      ])
      .where("pitak.status = :status", { status })
      .andWhere("session.id = :sessionId", { sessionId: currentSessionId });

    // @ts-ignore
    if (filters.bukidId) {
      statsQuery.andWhere("pitak.bukidId = :bukidId", {
        // @ts-ignore
        bukidId: filters.bukidId,
      });
    }

    const stats = await statsQuery.getRawOne();

    return {
      status: true,
      message: `${status.charAt(0).toUpperCase() + status.slice(1)} pitaks retrieved successfully`,
      data: pitaks.map((p) => ({
        id: p.id,
        location: p.location,
        // @ts-ignore
        totalLuwang: parseFloat(p.totalLuwang),
        // @ts-ignore
        bukid: p.bukid
          ? {
              // @ts-ignore
              id: p.bukid.id,
              // @ts-ignore
              name: p.bukid.name,
              // @ts-ignore
              location: p.bukid.location,
            }
          : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        filters: { status, ...filters },
        stats: {
          total: parseInt(stats.total) || 0,
          totalLuWang: parseFloat(stats.totalLuWang) || 0,
          averageLuWang: parseFloat(stats.averageLuWang) || 0,
          minLuWang: parseFloat(stats.minLuWang) || 0,
          maxLuWang: parseFloat(stats.maxLuWang) || 0,
          dateRange: {
            oldest: stats.oldest,
            newest: stats.newest,
          },
        },
      },
    };
  } catch (error) {
    console.error(`Error retrieving ${status} pitaks:`, error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve ${status} pitaks: ${error.message}`,
      data: null,
    };
  }
};