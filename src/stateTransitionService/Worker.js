// src/stateTransitionServices/WorkerStateTransitionService.js
const { logger } = require("../utils/logger");
const { updateDb } = require("../utils/dbUtils/dbActions");

class WorkerStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async onActivate(worker, oldStatus = null, user = "system", qr = null) {
    logger.info(`[WorkerTransition] Worker #${worker.id} activated (old: ${oldStatus})`);
  }

  async onInactivate(worker, oldStatus = null, user = "system", qr = null) {
    logger.info(`[WorkerTransition] Worker #${worker.id} inactivated (old: ${oldStatus})`);
  }

  async onLeave(worker, oldStatus = null, user = "system", qr = null) {
    logger.info(`[WorkerTransition] Worker #${worker.id} on leave (old: ${oldStatus})`);
  }

  async onTerminate(worker, oldStatus = null, user = "system", qr = null) {
    logger.info(`[WorkerTransition] Worker #${worker.id} terminated (old: ${oldStatus})`);

    if (worker.assignments && worker.assignments.length > 0) {
      const Assignment = require("../entities/Assignment");
      const assignmentRepo = this._getRepo(qr, Assignment);
      for (const assignment of worker.assignments) {
        if (assignment.status === "active" && !assignment.deletedAt) {
          assignment.status = "cancelled";
          assignment.updatedAt = new Date();
          await updateDb(assignmentRepo, assignment, { queryRunner: qr, skipSignal: true });
          logger.info(`[WorkerTransition] Cancelled active assignment #${assignment.id} due to worker termination.`);
        }
      }
    }
  }
}

module.exports = { WorkerStateTransitionService };