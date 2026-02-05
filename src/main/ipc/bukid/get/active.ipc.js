// ipc/bukid/get/active.ipc.js
//@ts-check

const { AppDataSource } = require("../../../db/dataSource");
const Bukid = require("../../../../entities/Bukid");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");
/**
 * Get active bukids scoped to current session
 * @param {Object} params - Parameters including filters
 * @param {Object} params.filters - Additional filters
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async function getActiveBukid(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    // @ts-ignore
    const { filters = {}, _userId } = params;
    // @ts-ignore
    const { page = 1, limit = 50 } = filters;

    // Get current session ID (you need to implement this function)
    const currentSessionId = await farmSessionDefaultSessionId();

    const queryBuilder = bukidRepository.createQueryBuilder('bukid')
      .leftJoinAndSelect('bukid.pitaks', 'pitaks')
      .leftJoinAndSelect('bukid.session', 'session')
      .where('bukid.status = :status', { status: 'active' })
      .andWhere('session.id = :sessionId', { sessionId: currentSessionId })
      .orderBy('bukid.name', 'ASC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [bukids, total] = await queryBuilder.getManyAndCount();

    return {
      status: true,
      message: 'Active bukids retrieved successfully',
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
    console.error('Error in getActiveBukid:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve active bukids: ${error.message}`,
      data: null
    };
  }
};

