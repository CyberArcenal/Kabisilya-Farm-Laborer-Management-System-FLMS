// ipc/bukid/get/summary.ipc.js
//@ts-check

const { AppDataSource } = require("../../../db/dataSource");
const Bukid = require("../../../../entities/Bukid");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get bukid summary scoped to current session
 * @param {Object} params - Parameters
 * @param {number} params.id - Bukid ID
 * @param {number} params._userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async function getBukidSummary(params = {}) {
  try {
    const bukidRepository = AppDataSource.getRepository(Bukid);
    // @ts-ignore
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
        // @ts-ignore
        session: { id: currentSessionId }
      },
      relations: ['pitaks', 'pitaks.assignments']
    });

    if (!bukid) {
      return {
        status: false,
        message: 'Bukid not found in current session',
        data: null
      };
    }

    // Calculate summary
    const summary = {
      id: bukid.id,
      name: bukid.name,
      location: bukid.location,
      status: bukid.status,
      // @ts-ignore
      pitakCount: bukid.pitaks?.length || 0,
      // @ts-ignore
      totalLuwang: bukid.pitaks?.reduce((sum, pitak) => 
        sum + parseFloat(pitak.totalLuwang || 0), 0) || 0,
      // @ts-ignore
      assignmentCount: bukid.pitaks?.reduce((sum, pitak) => 
        sum + (pitak.assignments?.length || 0), 0) || 0,
      // @ts-ignore
      activeAssignments: bukid.pitaks?.reduce((sum, pitak) => 
        // @ts-ignore
        sum + (pitak.assignments?.filter(a => a.status === 'active')?.length || 0), 0) || 0,
      createdAt: bukid.createdAt,
      updatedAt: bukid.updatedAt
    };

    return {
      status: true,
      message: 'Bukid summary retrieved successfully',
      data: { summary }
    };
  } catch (error) {
    console.error('Error in getBukidSummary:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve bukid summary: ${error.message}`,
      data: null
    };
  }
};