// src/ipc/bukid/update_status.ipc.js
//@ts-check

const { AppDataSource } = require("../../db/dataSource");
const Bukid = require("../../../entities/Bukid");
const Pitak = require("../../../entities/Pitak");
const Assignment = require("../../../entities/Assignment");
const Payment = require("../../../entities/Payment");
const PaymentHistory = require("../../../entities/PaymentHistory");
const { farmRatePerLuwang, farmSessionDefaultSessionId } = require("../../../utils/system");

/**
 * Update bukid status. If marking as "completed", cascade:
 *  - mark pitak as completed
 *  - mark assignments as completed
 *  - auto-generate payments per assignment (luwangCount * ratePerLuwang)
 *
 * Notes:
 *  - This version assumes your Assignment entity does NOT have a paymentGenerated flag
 *    and your Payment entity does NOT necessarily reference assignment_id.
 *  - Duplicate prevention relies on a DB unique index on (pitak_id, worker_id, session_id)
 *    and a pre-check + SQLite unique-constraint catch.
 *
 * @param {{ id: any; status: string; notes?: string; _userId?: any }} params
 * @param {import("typeorm").QueryRunner|null} queryRunner
 */
// @ts-ignore
module.exports = async function updateBukidStatus(params = {}, queryRunner = null) {
  let shouldRelease = false;

  if (!queryRunner) {
    // create a transaction-scoped queryRunner if none provided
    // @ts-ignore
    queryRunner = AppDataSource.createQueryRunner();
    // @ts-ignore
    await queryRunner.connect();
    // @ts-ignore
    await queryRunner.startTransaction();
    shouldRelease = true;
  }

  try {
    const { id, status, notes, _userId } = params || {};

    if (!id || !status) {
      return {
        status: false,
        message: "Bukid ID and status are required",
        data: null,
      };
    }

    const bukidRepo = queryRunner.manager.getRepository(Bukid);
    const pitakRepo = queryRunner.manager.getRepository(Pitak);
    const assignmentRepo = queryRunner.manager.getRepository(Assignment);
    const paymentRepo = queryRunner.manager.getRepository(Payment);
    const paymentHistoryRepo = queryRunner.manager.getRepository(PaymentHistory);

    const bukid = await bukidRepo.findOne({ where: { id } });
    if (!bukid) {
      return {
        status: false,
        message: "Bukid not found",
        data: null,
      };
    }

    // Only cascade when marking as completed
    const isCompleting = status === "completed";

    let updatedPitakCount = 0;
    let updatedAssignmentCount = 0;
    let generatedPaymentsCount = 0;
    let skippedPaymentsCount = 0;

    if (isCompleting) {
      // fetch all pitaks under this bukid
      // @ts-ignore
      const pitaks = await pitakRepo.find({ where: { bukid: { id } } });

      // prefetch rate and session once
      const ratePerLuwang = await farmRatePerLuwang();
      const sessionId = await farmSessionDefaultSessionId();

      for (const pitak of pitaks) {
        if (pitak.status === "completed") {
          continue; // already completed
        }

        // mark pitak completed
        pitak.status = "completed";
        pitak.updatedAt = new Date();
        updatedPitakCount++;

        // find active assignments for this pitak
        const assignments = await assignmentRepo.find({
          // @ts-ignore
          where: { pitak: { id: pitak.id }, status: "active" },
          relations: ["worker"],
        });

        if (assignments && assignments.length > 0) {
          for (const assignment of assignments) {
            // mark assignment completed
            assignment.status = "completed";
            assignment.updatedAt = new Date();
            updatedAssignmentCount++;

            // compute payment
            // Assignment.luwangCount may be stored as decimal/string; coerce safely
            const luwangCount = Number(assignment.luwangCount || 0);
            const grossPay = parseFloat((luwangCount * ratePerLuwang).toFixed(2));

            // === Pre-check: skip if payment already exists for pitak+worker+session ===
            const existingPayment = await paymentRepo.findOne({
              where: {
                // @ts-ignore
                pitak: { id: pitak.id },
                // @ts-ignore
                worker: { id: assignment.worker.id },
                session: { id: sessionId },
              },
            });

            if (existingPayment) {
              // skip creation (no assignment.paymentGenerated flag assumed)
              skippedPaymentsCount++;
              continue;
            }

            // create payment object (do NOT assume assignment relation exists in Payment)
            const payment = paymentRepo.create({
              // do not set assignment relation unless your Payment entity has it
              // worker and pitak relations are used for uniqueness check
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
              notes: `Auto-generated from bukid completion (bukid:${bukid.id})`,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Save with race-safe handling for SQLite: catch unique constraint and skip if concurrent created
            try {
              const savedPayment = await paymentRepo.save(payment);

              // create payment history (consistent with schema)
              const history = paymentHistoryRepo.create({
                // @ts-ignore
                payment: savedPayment,
                actionType: "create",
                changedField: "status",
                oldValue: null,
                newValue: "pending",
                oldAmount: 0.0,
                newAmount: grossPay,
                notes: "Payment auto-generated from bukid completion",
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
                    // @ts-ignore
                    pitak: { id: pitak.id },
                    // @ts-ignore
                    worker: { id: assignment.worker.id },
                    session: { id: sessionId },
                  },
                });
                if (existingAfter) {
                  skippedPaymentsCount++;
                  continue;
                }
              }
              // rethrow other errors to trigger rollback
              throw err;
            }
          }

          // save updated assignments in batch
          await assignmentRepo.save(assignments);
        }
      }

      // save updated pitaks in batch
      if (pitaks.length > 0) {
        await pitakRepo.save(pitaks);
      }
    }

    // update bukid status and notes
    const oldStatus = bukid.status;
    bukid.status = status;
    bukid.updatedAt = new Date();
    if (notes) {
      // @ts-ignore
      bukid.notes = (bukid.notes ? bukid.notes + "\n" : "") +
        `[${new Date().toISOString()}] Status changed to ${status}: ${notes}`;
    }
    const updatedBukid = await bukidRepo.save(bukid);

    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.commitTransaction();
    }

    return {
      status: true,
      message: `Bukid #${id} updated to '${status}'. ${isCompleting ? `${updatedPitakCount} pitak(s) completed, ${updatedAssignmentCount} assignment(s) completed, ${generatedPaymentsCount} payment(s) generated, ${skippedPaymentsCount} payment(s) skipped.` : ""}`,
      data: {
        id: updatedBukid.id,
        name: updatedBukid.name,
        location: updatedBukid.location,
        oldStatus,
        newStatus: updatedBukid.status,
        updatedAt: updatedBukid.updatedAt,
        updatedPitakCount,
        updatedAssignmentCount,
        generatedPaymentsCount,
        skippedPaymentsCount,
      },
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error("Error in updateBukidStatus:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to update bukid status: ${error && error.message ? error.message : String(error)}`,
      data: null,
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};