// src/stateTransitionServices/PaymentStateTransitionService.js
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const { saveDb } = require("../utils/dbUtils/dbActions");

class PaymentStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async onCompleted(payment, oldPayment, user = "system", qr = null) {
    logger.info(`[PaymentTransition] Payment #${payment.id} completed, old status: ${oldPayment?.status}`);
    await this._logHistory(payment, oldPayment, "completed", user, qr);
  }

  async onCancelled(payment, oldPayment, user = "system", qr = null) {
    logger.info(`[PaymentTransition] Payment #${payment.id} cancelled, old status: ${oldPayment?.status}`);
    await this._logHistory(payment, oldPayment, "cancelled", user, qr);
  }

  async onPartiallyPaid(payment, oldPayment, user = "system", qr = null) {
    logger.info(`[PaymentTransition] Payment #${payment.id} partially paid, old status: ${oldPayment?.status}`);
    await this._logHistory(payment, oldPayment, "partially_paid", user, qr);
  }

  async _logHistory(payment, oldPayment, actionType, user, qr) {
    const PaymentHistory = require("../entities/PaymentHistory");
    const historyRepo = this._getRepo(qr, PaymentHistory);
    const oldValue = oldPayment?.status || null;
    const newValue = payment.status;

    const history = historyRepo.create({
      payment,
      actionType,
      changedField: "status",
      oldValue,
      newValue,
      oldAmount: null,
      newAmount: null,
      notes: `Status changed from ${oldValue} to ${newValue}`,
      performedBy: user,
      referenceNumber: payment.referenceNumber,
      createdAt: new Date(),
    });

    await saveDb(historyRepo, history, { queryRunner: qr });
    await auditLogger.logCreate("PaymentHistory", history.id, history, user);
    logger.info(`[PaymentTransition] PaymentHistory #${history.id} created for payment #${payment.id}`);
  }
}

module.exports = { PaymentStateTransitionService };