// ipc/bukid/get/by_location.ipc.js
//@ts-check

const { AppDataSource } = require("../../../db/dataSource");
const Bukid = require("../../../../entities/Bukid");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get bukids by location scoped to current session
 * @param {Object} params - Parameters
 * @param {string} params.location - Location to search
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async function getBukidByLocation(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    const { location, _userId } = params;
    
    if (!location) {
      return {
        status: false,
        message: 'Location is required',
        data: null
      };
    }

    // Get current session ID
    const currentSessionId = await farmSessionDefaultSessionId();

    const bukids = await bukidRepository.find({
      where: { 
        location: location,
        // @ts-ignore
        session: { id: currentSessionId }
      },
      relations: ['pitaks']
    });

    return {
      status: true,
      message: 'Bukids retrieved successfully',
      data: { bukids }
    };
  } catch (error) {
    console.error('Error in getBukidByLocation:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve bukids: ${error.message}`,
      data: null
    };
  }
};