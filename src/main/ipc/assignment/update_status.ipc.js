// src/ipc/assignment/update_status.ipc.js
//@ts-check

const Assignment = require("../../../entities/Assignment");
const Pitak = require("../../../entities/Pitak");
const Payment = require("../../../entities/Payment");
const PaymentHistory = require("../../../entities/PaymentHistory");
const { validatePitak } = require("./utils/assignmentUtils");
const { farmRatePerLuwang, farmSessionDefaultSessionId } = require("../../../utils/system");

/**
 * Update assignment status
 * If marking an assignment as "completed" this handler will:
 *  - validate the related pitak
 *  - mark the assignment completed
 *  - attempt to auto-generate a payment for the assignment (idempotent)
 *
 * @param {Object} params - Update parameters
 * @param {import("typeorm").QueryRunner} queryRunner - Transaction query runner
 * @returns {Promise<Object>} Response object
 */
module.exports = async (params, queryRunner) => {
  try {
    const {
      // @ts-ignore
      assignmentId,
      // @ts-ignore
      status,
      // @ts-ignore
      notes,
      // @ts-ignore
      _userId,
    } = params || {};

    if (!assignmentId || !status) {
      return {
        status: false,
        message: "Missing required fields: assignmentId and status are required",
        data: null,
      };
    }

    const validStatuses = ["active", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return {
        status: false,
        message: "Invalid status. Must be one of: active, completed, cancelled",
        data: null,
      };
    }

    if (!queryRunner) {
      return {
        status: false,
        message: "QueryRunner (transaction) is required",
        data: null,
      };
    }

    const assignmentRepo = queryRunner.manager.getRepository(Assignment);

    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ["worker", "pitak", "session"],
    });

    if (!assignment) {
      return { status: false, message: "Assignment not found", data: null };
    }

    // Validate pitak (business rules)
    // @ts-ignore
    const pitakCheck = await validatePitak(queryRunner.manager.getRepository(Pitak), assignment.pitak?.id);
    if (!pitakCheck.valid) {
      return { status: false, message: pitakCheck.message, data: null };
    }

    if (assignment.status === status) {
      return {
        status: false,
        message: `Assignment is already ${status}`,
        data: assignment,
      };
    }

    if (status === "cancelled" && assignment.status === "completed") {
      return {
        status: false,
        message: "Cannot cancel a completed assignment",
        data: null,
      };
    }

    const previousStatus = assignment.status;

    // If marking completed, attempt payment generation (idempotent)
    let paymentCreated = false;
    let paymentSkipped = false;
    let createdPaymentId = null;

    if (status === "completed") {
      // compute payment
      const ratePerLuwang = await farmRatePerLuwang();
      const sessionId = await farmSessionDefaultSessionId();

      // coerce luwangCount safely
      const luwangCount = Number(assignment.luwangCount || 0);
      const grossPay = parseFloat((luwangCount * ratePerLuwang).toFixed(2));

      const paymentRepo = queryRunner.manager.getRepository(Payment);
      const paymentHistoryRepo = queryRunner.manager.getRepository(PaymentHistory);

      // Pre-check: try to find existing payment for this assignment (preferred) or by pitak+worker+session
      let existingPayment = null;
      try {
        if (assignment.id) {
          existingPayment = await paymentRepo.findOne({
            // @ts-ignore
            where: { assignment: { id: assignment.id } },
          });
        }
      } catch (e) {
        // ignore and fallback to composite check
      }

      if (!existingPayment) {
        existingPayment = await paymentRepo.findOne({
          where: {
            // @ts-ignore
            pitak: { id: assignment.pitak?.id },
            // @ts-ignore
            worker: { id: assignment.worker?.id },
            session: { id: sessionId },
          },
        });
      }

      if (existingPayment) {
        paymentSkipped = true;
        createdPaymentId = existingPayment.id;
      } else {
        // create payment object
        const payment = paymentRepo.create({
          // set assignment relation only if Payment entity supports it
          // @ts-ignore
          assignment: assignment.id ? { id: assignment.id } : null,
          // @ts-ignore
          worker: assignment.worker ? { id: assignment.worker.id } : null,
          // @ts-ignore
          pitak: assignment.pitak ? { id: assignment.pitak.id } : null,
          // @ts-ignore
          session: assignment.session ? { id: assignment.session.id || sessionId } : { id: sessionId },
          grossPay: grossPay,
          netPay: grossPay,
          manualDeduction: 0.0,
          totalDebtDeduction: 0.0,
          otherDeductions: 0.0,
          deductionBreakdown: null,
          status: "pending",
          paymentMethod: 'cash',
          // @ts-ignore
          periodStart: assignment.pitak?.startDate || null,
          // @ts-ignore
          periodEnd: assignment.pitak?.endDate || new Date(),
          notes: `Auto-generated from assignment completion (assignment:${assignment.id})`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        try {
          const savedPayment = await paymentRepo.save(payment);

          // create payment history
          const history = paymentHistoryRepo.create({
            // @ts-ignore
            payment: savedPayment,
            actionType: "create",
            changedField: "status",
            oldValue: null,
            newValue: "pending",
            oldAmount: 0.0,
            newAmount: grossPay,
            notes: "Payment auto-generated from assignment completion",
            performedBy: _userId ? String(_userId) : null,
            changeDate: new Date(),
          });
          await paymentHistoryRepo.save(history);

          paymentCreated = true;
          // @ts-ignore
          createdPaymentId = savedPayment.id;
        } catch (err) {
          // SQLite unique constraint detection:
          // err.code may be 'SQLITE_CONSTRAINT' and message contains 'UNIQUE constraint failed'
          const isSqliteUnique =
            err &&
            // @ts-ignore
            (err.code === "SQLITE_CONSTRAINT" ||
              // @ts-ignore
              (err.message && err.message.includes("UNIQUE constraint failed")));

          if (isSqliteUnique) {
            // concurrent process created the payment — fetch it and continue
            const existingAfter = await paymentRepo.findOne({
              where: {
                // @ts-ignore
                pitak: { id: assignment.pitak?.id },
                // @ts-ignore
                worker: { id: assignment.worker?.id },
                session: { id: sessionId },
              },
            });
            if (existingAfter) {
              paymentSkipped = true;
              createdPaymentId = existingAfter.id;
            } else {
              // if not found, rethrow to let caller handle
              throw err;
            }
          } else {
            // rethrow other errors
            throw err;
          }
        }
      }
    }

    // Persist assignment status change and notes
    assignment.status = status;
    assignment.updatedAt = new Date();

    if (notes) {
      // @ts-ignore
      const statusNote = `[Status Change ${previousStatus.toUpperCase()} → ${status.toUpperCase()}]: ${notes}`;
      assignment.notes = assignment.notes ? `${assignment.notes}\n${statusNote}` : statusNote;
    }

    // Optionally set paymentGenerated flags if your schema supports them
    try {
      // @ts-ignore
      if (typeof assignment.paymentGenerated !== "undefined") {
        // @ts-ignore
        assignment.paymentGenerated = paymentCreated || paymentSkipped ? true : assignment.paymentGenerated;
      }
      // @ts-ignore
      if (typeof assignment.paymentGeneratedAt !== "undefined" && (paymentCreated || paymentSkipped)) {
        // @ts-ignore
        assignment.paymentGeneratedAt = new Date();
      }
    } catch (e) {
      // ignore if fields don't exist
    }

    const updatedAssignment = await assignmentRepo.save(assignment);

    return {
      status: true,
      message: `Assignment status updated to ${status}${status === "completed" ? (paymentCreated ? " and payment created." : paymentSkipped ? " (payment already existed, skipped creation)." : "") : ""}`,
      data: {
        id: updatedAssignment.id,
        previousStatus,
        newStatus: updatedAssignment.status,
        assignmentDate: updatedAssignment.assignmentDate,
        // @ts-ignore
        worker: updatedAssignment.worker ? { id: updatedAssignment.worker.id, name: updatedAssignment.worker.name } : null,
        // @ts-ignore
        pitak: updatedAssignment.pitak ? { id: updatedAssignment.pitak.id, name: updatedAssignment.pitak.name } : null,
        payment: status === "completed" ? { created: paymentCreated, skipped: paymentSkipped, paymentId: createdPaymentId } : null,
        summary: {
          assignmentId: updatedAssignment.id,
          // @ts-ignore
          pitakId: updatedAssignment.pitak?.id ?? null,
          // @ts-ignore
          workerId: updatedAssignment.worker?.id ?? null,
          status: updatedAssignment.status,
        },
      },
    };
  } catch (error) {
    console.error("Error updating assignment status:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to update assignment status: ${error && error.message ? error.message : String(error)}`,
      data: null,
    };
  }
};