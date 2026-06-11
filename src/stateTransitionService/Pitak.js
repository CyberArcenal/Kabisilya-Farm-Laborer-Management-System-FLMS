// src/stateTransitionServices/PitakStateTransitionService.js
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const { updateDb } = require("../utils/dbUtils/dbActions");

class PitakStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async onActivate(pitak, oldStatus = null, user = "system", qr = null) {
    logger.info(`[PitakTransition] Activating pitak #${pitak.id}, old status: ${oldStatus}`);
  }

  async onComplete(pitak, oldStatus = null, user = "system", qr = null) {
    logger.info(`[PitakTransition] Completing pitak #${pitak.id}, old status: ${oldStatus}`);

    if (!pitak.assignments || pitak.assignments.length === 0) {
      logger.info(`[PitakTransition] Pitak #${pitak.id} has no assignments, nothing to cascade.`);
      return;
    }

    const Assignment = require("../entities/Assignment");
    const assignmentRepo = this._getRepo(qr, Assignment);

    for (const assignment of pitak.assignments) {
      if (assignment.status !== "completed") {
        const oldAssignmentStatus = assignment.status;
        assignment.status = "completed";
        assignment.updatedAt = new Date();
        try {
          await updateDb(assignmentRepo, assignment, { queryRunner: qr, skipSignal: true });
          await auditLogger.logUpdate("Assignment", assignment.id, { status: oldAssignmentStatus }, { status: "completed" }, user);
          logger.info(`[PitakTransition] Assignment #${assignment.id} set to complete due to pitak completion.`);
        } catch (error) {
          logger.error(`[PitakTransition] Failed to update assignment #${assignment.id}:`, error);
          throw error;
        }
      }
    }
    logger.info(`[PitakTransition] Pitak #${pitak.id} completion cascade finished.`);
  }

  async onCancelled(pitak, oldStatus = null, user = "system", qr = null) {
    logger.info(`[PitakTransition] Inactivating pitak #${pitak.id}, old status: ${oldStatus}`);
  }
}

module.exports = { PitakStateTransitionService };