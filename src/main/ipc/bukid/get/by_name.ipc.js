// ipc/bukid/get/by_name.ipc.js
// @ts-nocheck

const { AppDataSource } = require("../../../db/dataSource");
const Bukid = require("../../../../entities/Bukid");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get bukids by name scoped to current session
 * @param {Object} params - Parameters
 * @param {string} params.name - Name to search
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
module.exports = async function getBukidByName(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    const { name, _userId } = params;
    
    if (!name) {
      return {
        status: false,
        message: 'Name is required',
        data: null
      };
    }

    // Get current session ID
    const currentSessionId = await farmSessionDefaultSessionId();

    const bukids = await bukidRepository.find({
      where: { 
        name: name,
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
    console.error('Error in getBukidByName:', error);
    return {
      status: false,
      message: `Failed to retrieve bukids: ${error.message}`,
      data: null
    };
  }
};