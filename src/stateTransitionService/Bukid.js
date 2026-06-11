// src/stateTransitionServices/BukidStateTransitionService.js
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const { updateDb } = require("../utils/dbUtils/dbActions");

class BukidStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async onInitiated(bukid, oldStatus = null, user = "system", qr = null) {
    logger.info(`[BukidTransition] Bukid #${bukid.id} initiated.`);
  }

  async onActivate(bukid, oldStatus = null, user = "system", qr = null) {
    logger.info(`[BukidTransition] Activating bukid #${bukid.id}, old status: ${oldStatus}`);
  }

  async onComplete(bukid, oldStatus = null, user = "system", qr = null) {
    logger.info(`[BukidTransition] Completing bukid #${bukid.id}, old status: ${oldStatus}`);

    if (!bukid.pitaks || bukid.pitaks.length === 0) {
      logger.info(`[BukidTransition] Bukid #${bukid.id} has no pitaks, nothing to cascade.`);
      return;
    }

    const Pitak = require("../entities/Pitak");
    const pitakRepo = this._getRepo(qr, Pitak);
    for (const pitak of bukid.pitaks) {
      if (pitak.status !== "completed") {
        const oldPitakStatus = pitak.status;
        pitak.status = "completed";
        pitak.updatedAt = new Date();
        try {
          await updateDb(pitakRepo, pitak, { queryRunner: qr, skipSignal: true });
          await auditLogger.logUpdate("Pitak", pitak.id, { status: oldPitakStatus }, { status: "completed" }, user);
          logger.info(`[BukidTransition] Pitak #${pitak.id} set to complete due to bukid completion.`);
        } catch (error) {
          logger.error(`[BukidTransition] Failed to update pitak #${pitak.id}:`, error);
          throw error;
        }
      }
    }
    logger.info(`[BukidTransition] Bukid #${bukid.id} completion cascade finished.`);
  }

  async onCancelled(bukid, oldStatus = null, user = "system", qr = null) {
    logger.info(`[BukidTransition] Inactivating bukid #${bukid.id}, old status: ${oldStatus}`);
  }
}

module.exports = { BukidStateTransitionService };