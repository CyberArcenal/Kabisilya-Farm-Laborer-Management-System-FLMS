// src/ipc/pitak/get/stats.ipc.js
//@ts-check

const Pitak = require("../../../../entities/Pitak");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

// @ts-ignore
module.exports = async (dateRange = {}, userId) => {
  try {
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Get basic statistics with session filter
    const stats = await pitakRepo
      .createQueryBuilder("pitak")
      .leftJoin("pitak.bukid", "bukid")
      .leftJoin("bukid.session", "session")
      .select([
        "COUNT(*) as total",
        'SUM(CASE WHEN pitak.status = "active" THEN 1 ELSE 0 END) as active',
        'SUM(CASE WHEN pitak.status = "inactive" THEN 1 ELSE 0 END) as inactive',
        'SUM(CASE WHEN pitak.status = "completed" THEN 1 ELSE 0 END) as completed',
        "SUM(pitak.totalLuwang) as totalLuWangCapacity",
        "AVG(pitak.totalLuwang) as averageLuWang",
        "MIN(pitak.totalLuwang) as minLuWang",
        "MAX(pitak.totalLuwang) as maxLuWang",
      ])
      .where("session.id = :sessionId", { sessionId: currentSessionId })
      .getRawOne();

    // Get bukid distribution with session filter
    const bukidStats = await pitakRepo
      .createQueryBuilder("pitak")
      .leftJoin("pitak.bukid", "bukid")
      .leftJoin("bukid.session", "session")
      .select("bukid.name", "bukidName")
      .addSelect("COUNT(pitak.id)", "pitakCount")
      .where("session.id = :sessionId", { sessionId: currentSessionId })
      .groupBy("bukid.name")
      .getRawMany();

    return {
      status: true,
      message: "Pitak statistics retrieved successfully",
      data: {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        inactive: parseInt(stats.inactive) || 0,
        completed: parseInt(stats.completed) || 0,
        totalLuWangCapacity: parseFloat(stats.totalLuWangCapacity) || 0,
        averageLuWang: parseFloat(stats.averageLuWang) || 0,
        minLuWang: parseFloat(stats.minLuWang) || 0,
        maxLuWang: parseFloat(stats.maxLuWang) || 0,
        bukidDistribution: bukidStats.map((b) => ({
          bukidName: b.bukidName,
          pitakCount: parseInt(b.pitakCount) || 0,
        })),
      },
      meta: {
        sessionId: currentSessionId,
      },
    };
  } catch (error) {
    console.error("Error retrieving pitak stats:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve pitak stats: ${error.message}`,
      data: null,
    };
  }
};
