// src/stateTransitionServices/AssignmentStateTransitionService.js
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const notificationService = require("../services/Notification");
const emailSender = require("../channels/email.sender");
const smsSender = require("../channels/sms.sender");
const { farmRatePerLuwang, companyName } = require("../utils/settings/system");
const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");

class AssignmentStateTransitionService {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  async recalculateLuWangForPitakSession(pitakId, sessionId, user = "system", qr = null) {
    const Pitak = require("../entities/Pitak");
    const Assignment = require("../entities/Assignment");
    const pitakRepo = this._getRepo(qr, Pitak);
    const assignmentRepo = this._getRepo(qr, Assignment);

    const pitak = await pitakRepo.findOne({ where: { id: pitakId, deletedAt: null } });
    if (!pitak) {
      logger.error(`Pitak ${pitakId} not found during luwang recalculation`);
      return;
    }

    const totalLuwang = parseFloat(pitak.totalLuwang) || 0;
    const activeAssignments = await assignmentRepo.find({
      where: {
        pitak: { id: pitakId },
        session: { id: sessionId },
        status: "active",
        deletedAt: null,
      },
    });

    const count = activeAssignments.length;
    if (count === 0) return;

    const luwangPerWorker = totalLuwang / count;
    const newLuWang = Math.round(luwangPerWorker * 100) / 100;

    for (const assignment of activeAssignments) {
      if (assignment.luwangCount !== newLuWang) {
        const oldValue = assignment.luwangCount;
        assignment.luwangCount = newLuWang;
        assignment.updatedAt = new Date();
        await updateDb(assignmentRepo, assignment, { queryRunner: qr, skipSignal: true });
        await auditLogger.logUpdate("Assignment", assignment.id, { luwangCount: oldValue }, { luwangCount: newLuWang }, user);
        logger.info(`[AssignmentTransition] Assignment #${assignment.id} luwangCount updated from ${oldValue} to ${newLuWang}`);
      }
    }
  }

  async onInitiated(assignment, oldStatus = null, user = "system", qr = null) {
    logger.info(`[AssignmentTransition] Assignment #${assignment.id} initiated.`);
  }

  async onActivate(assignment, oldStatus = null, user = "system", qr = null) {
    logger.info(`[AssignmentTransition] Activating assignment #${assignment.id}, old status: ${oldStatus}`);
  }

  async onComplete(assignment, oldStatus = null, user = "system", qr = null) {
    logger.info(`[AssignmentTransition] Completing assignment #${assignment.id}, old status: ${oldStatus}`);

    try {
      const Payment = require("../entities/Payment");
      const paymentRepo = this._getRepo(qr, Payment);
      const rate = await farmRatePerLuwang();
      const grossPay = assignment.luwangCount * rate;
      const netPay = grossPay;

      const paymentData = {
        worker: assignment.worker,
        pitak: assignment.pitak,
        session: assignment.session,
        assignment: assignment,
        grossPay,
        netPay,
        status: "pending",
        paymentDate: null,
        periodStart: assignment.assignmentDate,
        periodEnd: assignment.assignmentDate,
        notes: `Auto-generated from completed assignment #${assignment.id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const payment = paymentRepo.create(paymentData);
      const savedPayment = await saveDb(paymentRepo, payment, { queryRunner: qr });
      await auditLogger.logCreate("Payment", savedPayment.id, savedPayment, user);
      logger.info(`[AssignmentTransition] Created payment #${savedPayment.id} for assignment #${assignment.id}`);
    } catch (error) {
      logger.error(`[AssignmentTransition] Failed to create payment for assignment #${assignment.id}:`, error);
    }

    await this._notifyRelevantParties(assignment, "completed", oldStatus, qr);
  }

  async onCancel(assignment, oldStatus = null, user = "system", qr = null) {
    logger.info(`[AssignmentTransition] Cancelling assignment #${assignment.id}, old status: ${oldStatus}`);
    await this._notifyRelevantParties(assignment, "cancelled", oldStatus, qr);
  }

  async _notifyRelevantParties(assignment, action, oldStatus = null, qr = null) {
    if (!assignment.worker) return;
    const worker = assignment.worker;
    const company = await companyName();

    const subject = `Assignment ${action} – #${assignment.id}`;
    let textBody = `Dear ${worker.name},\n\nYour assignment #${assignment.id} has been ${action}.`;
    if (action === "completed") {
      const rate = await farmRatePerLuwang();
      textBody += `\nLuWang: ${assignment.luwangCount} – payment ₱${assignment.luwangCount * rate} initiated.`;
    }
    const htmlBody = textBody.replace(/\n/g, "<br>");

    if (worker.email) {
      try {
        await emailSender.send(worker.email, subject, htmlBody, textBody, {}, true);
      } catch (error) {
        logger.error(`[Notification] Email failed:`, error);
      }
    }
    if (worker.contact) {
      try {
        await smsSender.send(worker.contact, `Assignment #${assignment.id} has been ${action}.`);
      } catch (error) {
        logger.error(`[Notification] SMS failed:`, error);
      }
    }
    try {
      await notificationService.create(
        {
          userId: worker.id,
          title: `Assignment ${action}`,
          message: `Assignment #${assignment.id} has been ${action}.`,
          type: action === "cancelled" ? "warning" : "info",
          metadata: { assignmentId: assignment.id },
        },
        "system",
        qr  // pass queryRunner to notification service
      );
    } catch (error) {
      logger.error(`[Notification] In-app notification failed:`, error);
    }
  }
}

module.exports = { AssignmentStateTransitionService };