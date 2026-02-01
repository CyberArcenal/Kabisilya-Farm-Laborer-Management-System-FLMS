// src/ipc/pitak/update_status.ipc.js
//@ts-check

const Pitak = require("../../../entities/Pitak");
const Assignment = require("../../../entities/Assignment");
const Payment = require("../../../entities/Payment");
const PaymentHistory = require("../../../entities/PaymentHistory");
const UserActivity = require("../../../entities/UserActivity");
const {
  farmSessionDefaultSessionId,
  farmRatePerLuwang,
} = require("../../../utils/system");

// @ts-ignore
module.exports = async (params, queryRunner) => {
  try {
    const { id, status, notes, _userId } = params;

    if (!id || !status) {
      throw new Error("Pitak ID and status are required");
    }

    const validStatuses = ["active", "inactive", "completed"];
    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    if (!queryRunner) {
      throw new Error("QueryRunner is required for this handler");
    }

    const pitakRepo = queryRunner.manager.getRepository(Pitak);
    const pitak = await pitakRepo.findOne({ where: { id } });

    if (!pitak) {
      throw new Error("Pitak not found");
    }

    const oldStatus = pitak.status;
    let updatedAssignmentsCount = 0;
    let generatedPaymentsCount = 0;
    let skippedPaymentsCount = 0;

    // If marking as completed, mark assignments and generate payments
    if (status === "completed") {
      const assignmentRepo = queryRunner.manager.getRepository(Assignment);
      const activeAssignments = await assignmentRepo.find({
        where: { pitak: { id }, status: "active" },
        relations: ["worker"],
      });

      if (activeAssignments.length > 0) {
        // mark assignments completed first (in-memory)
        for (const assignment of activeAssignments) {
          assignment.status = "completed";
          assignment.updatedAt = new Date();
        }
        // persist assignment status updates in batch
        await assignmentRepo.save(activeAssignments);
        updatedAssignmentsCount = activeAssignments.length;
      }

      // Generate payments based on luwang allocation
      const paymentRepo = queryRunner.manager.getRepository(Payment);
      const paymentHistoryRepo = queryRunner.manager.getRepository(PaymentHistory);
      const sessionId = await farmSessionDefaultSessionId();
      const ratePerLuwang = await farmRatePerLuwang();

      for (const assignment of activeAssignments) {
        // coerce luwangCount safely (could be decimal string)
        const luwangCount = Number(assignment.luwangCount || 0);
        const grossPay = parseFloat((luwangCount * ratePerLuwang).toFixed(2));

        // Pre-check: skip if payment already exists for pitak+worker+session
        const existingPayment = await paymentRepo.findOne({
          where: {
            pitak: { id: pitak.id },
            worker: { id: assignment.worker.id },
            session: { id: sessionId },
          },
        });

        if (existingPayment) {
          skippedPaymentsCount++;
          continue;
        }

        // create payment object
        const payment = paymentRepo.create({
          // @ts-ignore
          worker: { id: assignment.worker.id },
          pitak: { id: pitak.id },
          session: { id: sessionId },
          grossPay: grossPay,
          netPay: grossPay,
          manualDeduction: 0.0,
          totalDebtDeduction: 0.0,
          otherDeductions: 0.0,
          deductionBreakdown: null,
          status: "pending",
          paymentMethod: 'cash',
          // @ts-ignore
          periodStart: pitak.startDate || null,
          // @ts-ignore
          periodEnd: pitak.endDate || new Date(),
          notes: `Auto-generated from pitak completion (pitak:${pitak.id})`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Save with race-safe handling for SQLite: catch unique constraint and skip if concurrent created
        try {
          const savedPayment = await paymentRepo.save(payment);

          // Payment history
          const history = paymentHistoryRepo.create({
            // @ts-ignore
            payment: savedPayment,
            actionType: "create",
            changedField: "status",
            oldValue: null,
            newValue: "pending",
            oldAmount: 0.0,
            newAmount: grossPay,
            notes: "Payment auto-generated from pitak completion",
            performedBy: _userId ? String(_userId) : null,
            changeDate: new Date(),
          });
          await paymentHistoryRepo.save(history);

          generatedPaymentsCount++;
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
            // concurrent process created the payment — fetch it and skip
            const existingAfter = await paymentRepo.findOne({
              where: {
                pitak: { id: pitak.id },
                worker: { id: assignment.worker.id },
                session: { id: sessionId },
              },
            });
            if (existingAfter) {
              skippedPaymentsCount++;
              continue;
            }
          }
          // rethrow other errors to trigger rollback upstream
          throw err;
        }
      }
    }

    // Update pitak status and notes
    pitak.status = status;
    if (notes) {
      pitak.notes =
        (pitak.notes ? pitak.notes + "\n" : "") +
        `[${new Date().toISOString()}] Status changed to ${status}: ${notes}`;
    }
    pitak.updatedAt = new Date();

    const updatedPitak = await pitakRepo.save(pitak);

    // Log activity (index/global logging may already exist; keep this if you want handler-level activity)
    await queryRunner.manager.getRepository(UserActivity).save({
      user_id: _userId,
      action: "update_pitak_status",
      entity: "Pitak",
      entity_id: updatedPitak.id,
      session: { id: await farmSessionDefaultSessionId() },
      details: JSON.stringify({
        oldStatus,
        newStatus: status,
        notes,
        updatedAssignmentsCount,
        generatedPaymentsCount,
        skippedPaymentsCount,
      }),
      created_at: new Date(),
    });

    return {
      status: true,
      message: `Pitak status updated from ${oldStatus} to ${status}. ${
        updatedAssignmentsCount > 0 ? `${updatedAssignmentsCount} assignments marked completed. ` : ""
      }${
        generatedPaymentsCount > 0 ? `${generatedPaymentsCount} payments auto-generated. ` : ""
      }${skippedPaymentsCount > 0 ? `${skippedPaymentsCount} payments skipped (already existed).` : ""}`,
      data: {
        id: updatedPitak.id,
        oldStatus,
        newStatus: updatedPitak.status,
        updatedAt: updatedPitak.updatedAt,
        updatedAssignmentsCount,
        generatedPaymentsCount,
        skippedPaymentsCount,
      },
    };
  } catch (error) {
    console.error("Error updating pitak status:", error);
    throw error; // allow transaction rollback by caller
  }
};