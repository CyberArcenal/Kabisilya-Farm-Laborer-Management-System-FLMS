// src/ipc/pitak/get/all.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
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
      .where("session.id = :sessionId", { sessionId: currentSessionId });

    // Apply filters
    // @ts-ignore
    if (filters.status) {
      // @ts-ignore
      query.andWhere("pitak.status = :status", { status: filters.status });
    }
    // @ts-ignore
    if (filters.bukidId) {
      // @ts-ignore
      query.andWhere("pitak.bukidId = :bukidId", { bukidId: filters.bukidId });
    }
    // @ts-ignore
    if (filters.location) {
      // @ts-ignore
      query.andWhere("pitak.location LIKE :location", { location: `%${filters.location}%` });
    }
    // @ts-ignore
    if (filters.minLuwang) {
      // @ts-ignore
      query.andWhere("pitak.totalLuwang >= :minLuwang", { minLuwang: filters.minLuwang });
    }
    // @ts-ignore
    if (filters.maxLuwang) {
      // @ts-ignore
      query.andWhere("pitak.totalLuwang <= :maxLuwang", { maxLuwang: filters.maxLuwang });
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

    // Get summary stats
    const statsQuery = pitakRepo
      .createQueryBuilder("pitak")
      .leftJoin("pitak.bukid", "bukid")
      .leftJoin("bukid.session", "session")
      .select([
        "COUNT(*) as total",
        "SUM(pitak.totalLuwang) as totalLuwang",
        "AVG(pitak.totalLuwang) as averageLuwang",
        "SUM(CASE WHEN pitak.status = 'active' THEN 1 ELSE 0 END) as activeCount",
        "SUM(CASE WHEN pitak.status = 'inactive' THEN 1 ELSE 0 END) as inactiveCount",
        "SUM(CASE WHEN pitak.status = 'completed' THEN 1 ELSE 0 END) as harvestedCount",
      ])
      .where("session.id = :sessionId", { sessionId: currentSessionId });

    // @ts-ignore
    if (filters.bukidId) {
      // @ts-ignore
      statsQuery.andWhere("pitak.bukidId = :bukidId", { bukidId: filters.bukidId });
    }

    const stats = await statsQuery.getRawOne();

    return {
      status: true,
      message: "Pitaks retrieved successfully",
      data: pitaks.map(p => ({
        id: p.id,
        location: p.location,
        // @ts-ignore
        totalLuwang: parseFloat(p.totalLuwang),
        status: p.status,
        // @ts-ignore
        bukid: p.bukid ? {
          // @ts-ignore
          id: p.bukid.id,
          // @ts-ignore
          name: p.bukid.name,
          // @ts-ignore
          location: p.bukid.location,
        } : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          total: parseInt(stats.total) || 0,
          totalLuwang: parseFloat(stats.totalLuwang) || 0,
          averageLuwang: parseFloat(stats.averageLuwang) || 0,
          activeCount: parseInt(stats.activeCount) || 0,
          inactiveCount: parseInt(stats.inactiveCount) || 0,
          harvestedCount: parseInt(stats.harvestedCount) || 0,
        },
        filters,
      },
    };
  } catch (error) {
    console.error("Error retrieving pitaks:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pitaks: ${error.message}`,
      data: null,
    };
  }
};