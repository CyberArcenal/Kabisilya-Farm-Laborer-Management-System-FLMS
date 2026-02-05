// ipc/bukid/get/all.ipc.js
// @ts-nocheck

const { AppDataSource } = require("../../../db/dataSource");
const Bukid = require("../../../../entities/Bukid");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get all bukids scoped to current session
 * @param {Object} params - Parameters including filters
 * @param {Object} params.filters - Additional filters
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
module.exports = async function getAllBukid(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    const { filters = {}, _userId } = params;
    
    const { 
      status, 
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    // Get current session ID
    const currentSessionId = await farmSessionDefaultSessionId();

    const queryBuilder = bukidRepository.createQueryBuilder('bukid')
      .leftJoinAndSelect('bukid.pitaks', 'pitaks')
      .leftJoinAndSelect('bukid.session', 'session')
      .where('session.id = :sessionId', { sessionId: currentSessionId });

    if (status) {
      queryBuilder.andWhere('bukid.status = :status', { status });
    }

    queryBuilder.orderBy(`bukid.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [bukids, total] = await queryBuilder.getManyAndCount();

    return {
      status: true,
      message: 'Bukids retrieved successfully',
      data: {
        bukids,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error) {
    console.error('Error in getAllBukid:', error);
    return {
      status: false,
      message: `Failed to retrieve bukids: ${error.message}`,
      data: null
    };
  }
};