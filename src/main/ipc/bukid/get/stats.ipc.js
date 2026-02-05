// ipc/bukid/stats.ipc.js
// @ts-nocheck

const Bukid = require("../../../../entities/Bukid");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get bukid statistics scoped to current session
 * @param {Object} params - Parameters
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
module.exports = async function getBukidStats(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    const { _userId } = params;
    
    // Get current session ID
    const currentSessionId = await farmSessionDefaultSessionId();

    // Get basic counts scoped to current session
    const stats = await bukidRepository
      .createQueryBuilder('bukid')
      .leftJoin('bukid.session', 'session')
      .select('COUNT(bukid.id)', 'total')
      .addSelect('COUNT(CASE WHEN bukid.status = "active" THEN 1 END)', 'active')
      .addSelect('COUNT(CASE WHEN bukid.status = "inactive" THEN 1 END)', 'inactive')
      .addSelect('COUNT(CASE WHEN bukid.status = "archived" THEN 1 END)', 'archived')
      .where('session.id = :sessionId', { sessionId: currentSessionId })
      .getRawOne();

    // Get pitak distribution scoped to current session
    const pitakDistribution = await bukidRepository
      .createQueryBuilder('bukid')
      .leftJoin('bukid.pitaks', 'pitak')
      .leftJoin('bukid.session', 'session')
      .select('bukid.id', 'bukidId')
      .addSelect('bukid.name', 'bukidName')
      .addSelect('COUNT(pitak.id)', 'pitakCount')
      .addSelect('SUM(pitak.totalLuwang)', 'totalLuwang')
      .where('session.id = :sessionId', { sessionId: currentSessionId })
      .groupBy('bukid.id')
      .orderBy('pitakCount', 'DESC')
      .getRawMany();

    // Get recent bukid activity scoped to current session
    const recentBukid = await bukidRepository.find({
      where: {
        session: { id: currentSessionId }
      },
      order: { updatedAt: 'DESC' },
      take: 5,
    });

    return {
      status: true,
      message: 'Statistics retrieved successfully',
      data: { 
        summary: {
          totalBukid: parseInt(stats.total) || 0,
          activeBukid: parseInt(stats.active) || 0,
          inactiveBukid: parseInt(stats.inactive) || 0,
          archivedBukid: parseInt(stats.archived) || 0,
        },
        pitakDistribution,
        recentBukid
      }
    };
  } catch (error) {
    console.error('Error in getBukidStats:', error);
    return {
      status: false,
      message: `Failed to get statistics: ${error.message}`,
      data: null
    };
  }
};