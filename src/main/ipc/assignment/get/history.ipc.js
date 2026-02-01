// src/ipc/assignment/get/history.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");

/**
 * Get assignment history (status changes and updates)
 * @param {number} assignmentId - Assignment ID
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>} Response object
 */
// @ts-ignore
module.exports = async (assignmentId, userId) => {
  try {
    if (!assignmentId) {
      return {
        status: false,
        message: "Assignment ID is required",
        data: null
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    
    // Get assignment with relations
    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ["worker", "pitak"]
    });

    if (!assignment) {
      return {
        status: false,
        message: "Assignment not found",
        data: null
      };
    }

    // Parse notes to extract history
    const history = [];
    const notes = assignment.notes || '';
    
    // Split notes by newline and look for history markers
    // @ts-ignore
    const noteLines = notes.split('\n').filter((/** @type {string} */ line) => line.trim());
    
    noteLines.forEach((/** @type {string} */ line) => {
      // Look for status change markers
      if (line.includes('[Status Change to')) {
        const match = line.match(/\[Status Change to (\w+)\]:\s*(.+)/);
        if (match) {
          history.push({
            type: 'STATUS_CHANGE',
            from: assignment.status, // Note: This assumes current status is the last one
            to: match[1],
            reason: match[2].trim(),
            timestamp: assignment.updatedAt
          });
        }
      }
      // Look for LuWang update markers
      else if (line.includes('[LuWang Update')) {
        const match = line.match(/\[LuWang Update ([\d.]+) → ([\d.]+)\]:\s*(.+)/);
        if (match) {
          history.push({
            type: 'LUWANG_UPDATE',
            from: parseFloat(match[1]),
            to: parseFloat(match[2]),
            difference: (parseFloat(match[2]) - parseFloat(match[1])).toFixed(2),
            reason: match[3].trim(),
            timestamp: assignment.updatedAt
          });
        }
      }
      // Look for reassignment markers
      else if (line.includes('[Reassignment]')) {
        const match = line.match(/\[Reassignment\]:\s*(.+)/);
        if (match) {
          history.push({
            type: 'REASSIGNMENT',
            details: match[1].trim(),
            timestamp: assignment.updatedAt
          });
        }
      }
      // Regular notes
      else if (!line.startsWith('[')) {
        history.push({
          type: 'NOTE',
          content: line.trim(),
          timestamp: assignment.createdAt // Approximate
        });
      }
    });

    // Add creation as first history entry
    history.unshift({
      type: 'CREATED',
      details: 'Assignment created',
      timestamp: assignment.createdAt
    });

    // Sort history by timestamp (newest first)
    // @ts-ignore
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      status: true,
      message: "Assignment history retrieved successfully",
      data: {
        assignment: {
          id: assignment.id,
          // @ts-ignore
          luwangCount: parseFloat(assignment.luwangCount).toFixed(2),
          assignmentDate: assignment.assignmentDate,
          status: assignment.status,
          // @ts-ignore
          worker: assignment.worker ? {
            // @ts-ignore
            id: assignment.worker.id,
            // @ts-ignore
            name: assignment.worker.name
          } : null,
          // @ts-ignore
          pitak: assignment.pitak ? {
            // @ts-ignore
            id: assignment.pitak.id,
            // @ts-ignore
            name: assignment.pitak.name
          } : null
        },
        history,
        summary: {
          totalHistoryEntries: history.length,
          statusChanges: history.filter(h => h.type === 'STATUS_CHANGE').length,
          luwangUpdates: history.filter(h => h.type === 'LUWANG_UPDATE').length,
          notes: history.filter(h => h.type === 'NOTE').length
        }
      }
    };

  } catch (error) {
    console.error("Error getting assignment history:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to retrieve assignment history: ${error.message}`,
      data: null
    };
  }
};