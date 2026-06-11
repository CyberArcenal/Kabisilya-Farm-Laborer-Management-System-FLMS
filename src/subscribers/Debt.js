// src/subscribers/DebtSubscriber.js
const Debt = require("../entities/Debt");
const { DebtStateTransitionService } = require("../stateTransitionService/Debt");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading DebtSubscriber");

class DebtSubscriber {
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.transitionService = new DebtStateTransitionService(dataSource);
  }

  listenTo() {
    return Debt;
  }

  async afterInsert(entity, { manager, queryRunner }) {
    try {
      logger.info("[DebtSubscriber] afterInsert", { id: entity.id });
    } catch (err) {
      logger.error("[DebtSubscriber] afterInsert error", err);
    }
  }

  async afterUpdate(event, { manager, queryRunner }) {
    const { databaseEntity, entity } = event;
    if (!entity) return;
    logger.info("[DebtSubscriber] afterUpdate", { id: entity.id, oldStatus: databaseEntity?.status, newStatus: entity.status });

    if (databaseEntity && databaseEntity.status === entity.status) return;

    const hydrated = await this._hydrateDebt(entity.id, queryRunner);
    if (!hydrated) return;

    switch (entity.status) {
      case "partially_paid":
        await this.transitionService.onPartiallyPaid(hydrated, databaseEntity, "system", queryRunner);
        break;
      case "paid":
        await this.transitionService.onPaid(hydrated, databaseEntity, "system", queryRunner);
        break;
      case "cancelled":
        await this.transitionService.onCancel(hydrated, databaseEntity, "system", queryRunner);
        break;
      case "overdue":
        await this.transitionService.onOverdue(hydrated, databaseEntity, "system", queryRunner);
        break;
      default:
        logger.warn(`[DebtSubscriber] Unhandled status: ${entity.status}`);
    }
  }

  async _hydrateDebt(debtId, queryRunner) {
    const debtRepo = queryRunner ? queryRunner.manager.getRepository(Debt) : this.dataSource.getRepository(Debt);
    const debt = await debtRepo.findOne({
      where: { id: debtId },
      relations: ["worker", "session"],
    });
    if (!debt) {
      logger.error(`[DebtSubscriber] Debt #${debtId} not found`);
      return null;
    }
    return debt;
  }
}

module.exports = DebtSubscriber;