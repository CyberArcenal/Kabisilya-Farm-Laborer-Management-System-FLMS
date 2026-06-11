// src/subscribers/BukidSubscriber.js
const Bukid = require("../entities/Bukid");
const { BukidStateTransitionService } = require("../stateTransitionService/Bukid");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading BukidSubscriber");

class BukidSubscriber {
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.transitionService = new BukidStateTransitionService(dataSource);
  }

  listenTo() {
    return Bukid;
  }

  async afterInsert(entity, { manager, queryRunner }) {
    try {
      logger.info("[BukidSubscriber] afterInsert", { id: entity.id });
      const hydrated = await this._hydrateBukid(entity.id, queryRunner);
      if (hydrated) {
        await this.transitionService.onInitiated(hydrated, null, "system", queryRunner);
      }
    } catch (err) {
      logger.error("[BukidSubscriber] afterInsert error", err);
    }
  }

  async afterUpdate(event, { manager, queryRunner }) {
    const { databaseEntity, entity } = event;
    if (!entity) return;
    logger.info("[BukidSubscriber] afterUpdate", { id: entity.id, oldStatus: databaseEntity?.status, newStatus: entity.status });

    if (databaseEntity && databaseEntity.status === entity.status) return;

    const hydrated = await this._hydrateBukid(entity.id, queryRunner);
    if (!hydrated) return;

    switch (entity.status) {
      case "active":
        await this.transitionService.onActivate(hydrated, databaseEntity?.status, "system", queryRunner);
        break;
      case "completed":
        await this.transitionService.onComplete(hydrated, databaseEntity?.status, "system", queryRunner);
        break;
      case "cancelled":
        await this.transitionService.onCancelled(hydrated, databaseEntity?.status, "system", queryRunner);
        break;
      case "initiated":
        await this.transitionService.onInitiated(hydrated, databaseEntity?.status, "system", queryRunner);
        break;
      default:
        logger.warn(`[BukidSubscriber] Unhandled status: ${entity.status}`);
    }
  }

  async _hydrateBukid(bukidId, queryRunner) {
    const bukidRepo = queryRunner ? queryRunner.manager.getRepository(Bukid) : this.dataSource.getRepository(Bukid);
    const bukid = await bukidRepo.findOne({
      where: { id: bukidId },
      relations: ["pitaks"],
    });
    if (!bukid) {
      logger.error(`[BukidSubscriber] Bukid #${bukidId} not found`);
      return null;
    }
    return bukid;
  }
}

module.exports = BukidSubscriber;