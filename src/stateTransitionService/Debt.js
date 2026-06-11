// src/stateTransitionServices/DebtStateTransitionService.js
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const notificationService = require("../services/Notification");
const emailSender = require("../channels/email.sender");
const smsSender = require("../channels/sms.sender");
const { companyName } = require("../utils/settings/system");
const { saveDb } = require("../utils/dbUtils/dbActions");

class DebtStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async onPaid(debt, oldDebt, user = "system", qr = null) {
    logger.info(`[DebtTransition] Debt #${debt.id} paid, old status: ${oldDebt?.status}`);
    await this._logHistory(debt, oldDebt, "paid", user, qr);
    await this._notifyWorker(debt, "paid", qr);
  }

  async onPartiallyPaid(debt, oldDebt, user = "system", qr = null) {
    logger.info(`[DebtTransition] Debt #${debt.id} partially paid, old status: ${oldDebt?.status}`);
    await this._logHistory(debt, oldDebt, "partially_paid", user, qr);
    await this._notifyWorker(debt, "partially paid", qr);
  }

  async onCancel(debt, oldDebt, user = "system", qr = null) {
    logger.info(`[DebtTransition] Debt #${debt.id} cancelled, old status: ${oldDebt?.status}`);
    await this._logHistory(debt, oldDebt, "cancelled", user, qr);
    await this._notifyWorker(debt, "cancelled", qr);
  }

  async onOverdue(debt, oldDebt, user = "system", qr = null) {
    logger.info(`[DebtTransition] Debt #${debt.id} overdue, old status: ${oldDebt?.status}`);
    await this._logHistory(debt, oldDebt, "overdue", user, qr);
    await this._notifyWorker(debt, "overdue", qr);
  }

  async _logHistory(debt, oldDebt, transactionType, user, qr) {
    const DebtHistory = require("../entities/DebtHistory");
    const historyRepo = this._getRepo(qr, DebtHistory);
    const previousBalance = oldDebt?.balance ?? debt.balance;
    const newBalance = debt.balance;

    const history = historyRepo.create({
      debt,
      amountPaid: 0,
      previousBalance,
      newBalance,
      transactionType,
      notes: `Status changed from ${oldDebt?.status} to ${debt.status}`,
      performedBy: user,
      referenceNumber: null,
      paymentMethod: null,
      createdAt: new Date(),
    });

    await saveDb(historyRepo, history, { queryRunner: qr });
    await auditLogger.logCreate("DebtHistory", history.id, history, user);
    logger.info(`[DebtTransition] DebtHistory #${history.id} created for debt #${debt.id}`);
  }

  async _notifyWorker(debt, action, qr) {
    const worker = debt.worker;
    if (!worker) {
      logger.warn(`[DebtTransition] No worker for debt #${debt.id} – notification skipped`);
      return;
    }

    const company = await companyName();
    const subject = `Debt ${action.charAt(0).toUpperCase() + action.slice(1)} – #${debt.id}`;
    let textBody = `Dear ${worker.name},\n\nYour debt #${debt.id} has been marked as ${action}.\n\n`;
    textBody += `Original Amount: ${debt.originalAmount}\nCurrent Balance: ${debt.balance}\n`;
    if (debt.reason) textBody += `Reason: ${debt.reason}\n`;
    textBody += `\nThank you,\n${company}`;
    const htmlBody = textBody.replace(/\n/g, "<br>");

    if (worker.email) {
      try {
        await emailSender.send(worker.email, subject, htmlBody, textBody, {}, true);
      } catch (error) {
        logger.error(`[DebtTransition] Failed to queue email for debt #${debt.id}`, error);
      }
    }
    if (worker.contact) {
      try {
        await smsSender.send(worker.contact, `Debt #${debt.id} has been ${action}. Check your email for details.`);
      } catch (error) {
        logger.error(`[DebtTransition] SMS failed for worker ${worker.contact}`, error);
      }
    }
    try {
      await notificationService.create(
        {
          userId: worker.id,
          title: `Debt ${action}`,
          message: `Debt #${debt.id} has been ${action}.`,
          type: action === "cancelled" || action === "overdue" ? "warning" : "info",
          metadata: { debtId: debt.id, status: action },
        },
        "system",
        qr
      );
    } catch (err) {
      logger.error(`[DebtTransition] Failed to create in-app notification for debt #${debt.id}`, err);
    }
  }
}

module.exports = { DebtStateTransitionService };