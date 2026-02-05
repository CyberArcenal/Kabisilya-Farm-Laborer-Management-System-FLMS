// src/ipc/assignment/get/history.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const { AppDataSource } = require("../../../db/dataSource");
const { farmSessionDefaultSessionId } = require("../../../../utils/system");

/**
 * Get assignment history (status changes and updates) scoped to current session
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
        data: { errors: ["Missing assignmentId parameter"] },
      };
    }

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const currentSessionId = await farmSessionDefaultSessionId();

    // Get assignment with relations, scoped to session
    const assignment = await assignmentRepo.findOne({
      // @ts-ignore
      where: { id: assignmentId, session: { id: currentSessionId } },
      relations: ["worker", "pitak", "session"],
    });

    if (!assignment) {
      return {
        status: false,
        message: "Assignment not found in current session",
        data: {
          errors: [
            `Assignment ${assignmentId} not found or not part of active session`,
          ],
        },
      };
    }

    // Parse notes to extract history
    const history = [];
    const notes = assignment.notes || "";

    // @ts-ignore
    const noteLines = notes.split("\n").filter((line) => line.trim());

    // @ts-ignore
    noteLines.forEach((line) => {
      if (line.includes("[Status Change to")) {
        const match = line.match(/\[Status Change to (\w+)\]:\s*(.+)/);
        if (match) {
          history.push({
            type: "STATUS_CHANGE",
            to: match[1],
            reason: match[2].trim(),
            timestamp: assignment.updatedAt,
          });
        }
      } else if (line.includes("[LuWang Update")) {
        const match = line.match(
          /\[LuWang Update ([\d.]+) → ([\d.]+)\]:\s*(.+)/,
        );
        if (match) {
          history.push({
            type: "LUWANG_UPDATE",
            from: parseFloat(match[1]),
            to: parseFloat(match[2]),
            difference: (parseFloat(match[2]) - parseFloat(match[1])).toFixed(
              2,
            ),
            reason: match[3].trim(),
            timestamp: assignment.updatedAt,
          });
        }
      } else if (line.includes("[Reassignment]")) {
        const match = line.match(/\[Reassignment\]:\s*(.+)/);
        if (match) {
          history.push({
            type: "REASSIGNMENT",
            details: match[1].trim(),
            timestamp: assignment.updatedAt,
          });
        }
      } else if (!line.startsWith("[")) {
        history.push({
          type: "NOTE",
          content: line.trim(),
          timestamp: assignment.createdAt,
        });
      }
    });

    // Add creation as first history entry
    history.unshift({
      type: "CREATED",
      details: "Assignment created",
      timestamp: assignment.createdAt,
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
          worker: assignment.worker
            // @ts-ignore
            ? { id: assignment.worker.id, name: assignment.worker.name }
            : null,
          // @ts-ignore
          pitak: assignment.pitak
            // @ts-ignore
            ? { id: assignment.pitak.id, name: assignment.pitak.name }
            : null,
          // @ts-ignore
          session: { id: assignment.session.id },
        },
        history,
        summary: {
          totalHistoryEntries: history.length,
          statusChanges: history.filter((h) => h.type === "STATUS_CHANGE")
            .length,
          luwangUpdates: history.filter((h) => h.type === "LUWANG_UPDATE")
            .length,
          notes: history.filter((h) => h.type === "NOTE").length,
        },
      },
      meta: { sessionId: currentSessionId },
    };
  } catch (error) {
    console.error("Error getting assignment history:", error);
    return {
      status: false,
      message: "Failed to retrieve assignment history",
      // @ts-ignore
      data: { errors: [error.message || String(error)] },
    };
  }
};
