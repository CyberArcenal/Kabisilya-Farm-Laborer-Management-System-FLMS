// src/subscribers/PaymentSubscriber.js
const Payment = require("../entities/Payment");
const { PaymentStateTransitionService } = require("../stateTransitionService/Payment");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading PaymentSubscriber");

class PaymentSubscriber {
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.transitionService = new PaymentStateTransitionService(dataSource);
  }

  listenTo() {
    return Payment;
  }

  async afterInsert(entity, { manager, queryRunner }) {
    try {
      logger.info("[PaymentSubscriber] afterInsert", { id: entity.id });
    } catch (err) {
      logger.error("[PaymentSubscriber] afterInsert error", err);
    }
  }

  async afterUpdate(event, { manager, queryRunner }) {
    const { databaseEntity, entity } = event;
    if (!entity) return;
    logger.info("[PaymentSubscriber] afterUpdate", { id: entity.id, oldStatus: databaseEntity?.status, newStatus: entity.status });

    if (databaseEntity && databaseEntity.status === entity.status) return;

    const hydrated = await this._hydratePayment(entity.id, queryRunner);
    if (!hydrated) return;

    switch (entity.status) {
      case "completed":
        await this.transitionService.onCompleted(hydrated, databaseEntity, "system", queryRunner);
        break;
      case "cancelled":
        await this.transitionService.onCancelled(hydrated, databaseEntity, "system", queryRunner);
        break;
      case "partially_paid":
        await this.transitionService.onPartiallyPaid(hydrated, databaseEntity, "system", queryRunner);
        break;
      default:
        logger.warn(`[PaymentSubscriber] Unhandled status: ${entity.status}`);
    }
  }

  async _hydratePayment(paymentId, queryRunner) {
    const paymentRepo = queryRunner ? queryRunner.manager.getRepository(Payment) : this.dataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({
      where: { id: paymentId },
      relations: ["worker", "pitak", "session", "assignment"],
    });
    if (!payment) {
      logger.error(`[PaymentSubscriber] Payment #${paymentId} not found`);
      return null;
    }
    return payment;
  }
}

module.exports = PaymentSubscriber;