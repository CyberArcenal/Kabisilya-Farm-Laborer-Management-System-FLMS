// ipc/bukid/get/by_id.ipc.js
// @ts-nocheck

const { AppDataSource } = require("../../../db/dataSource");
const Bukid = require("../../../../entities/Bukid");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get bukid by ID scoped to current session
 * @param {Object} params - Parameters
 * @param {number} params.id - Bukid ID
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
module.exports = async function getBukidById(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    const { id, _userId } = params;
    
    if (!id) {
      return {
        status: false,
        message: 'Bukid ID is required',
        data: null
      };
    }

    // Get current session ID
    const currentSessionId = await farmSessionDefaultSessionId();

    const bukid = await bukidRepository.findOne({
      where: { 
        id,
        session: { id: currentSessionId }
      },
      relations: ['pitaks', 'pitaks.assignments', 'pitaks.assignments.worker']
    });

    if (!bukid) {
      return {
        status: false,
        message: 'Bukid not found in current session',
        data: null
      };
    }

    return {
      status: true,
      message: 'Bukid retrieved successfully',
      data: { bukid }
    };
  } catch (error) {
    console.error('Error in getBukidById:', error);
    return {
      status: false,
      message: `Failed to retrieve bukid: ${error.message}`,
      data: null
    };
  }
};