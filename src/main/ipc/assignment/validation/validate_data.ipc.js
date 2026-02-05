// src/ipc/assignment/validation/validate_data.ipc.js
//@ts-check
const Assignment = require("../../../../entities/Assignment");
const Worker = require("../../../../entities/Worker");
const Pitak = require("../../../../entities/Pitak");
const { AppDataSource } = require("../../../db/dataSource");

const AssignmentStatus = ["active", "completed", "cancelled"];

// @ts-ignore
module.exports = async (params) => {
  try {
    // @ts-ignore
    const { assignmentData, checkExisting = true, _userId } = params;
    console.log("[VALIDATION] Incoming params:", params);

    if (!assignmentData) {
      console.warn("[VALIDATION] No assignmentData provided");
      return { status: false, message: "Assignment data is required", data: null };
    }

    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedData: {},
      suggestions: []
    };

    // Required fields
    if (!assignmentData.workerIds || assignmentData.workerIds.length === 0) {
      validationResult.isValid = false;
      // @ts-ignore
      validationResult.errors.push("At least one workerId is required");
      console.error("[VALIDATION] Missing required field: workerIds");
    }
    if (!assignmentData.pitakId) {
      validationResult.isValid = false;
      // @ts-ignore
      validationResult.errors.push("pitakId is required");
    }
    if (!assignmentData.assignmentDate) {
      validationResult.isValid = false;
      // @ts-ignore
      validationResult.errors.push("assignmentDate is required");
    }

    const workerRepo = AppDataSource.getRepository(Worker);
    const pitakRepo = AppDataSource.getRepository(Pitak);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    // Worker validation (loop sa workerIds)
    if (assignmentData.workerIds && assignmentData.workerIds.length > 0) {
      // @ts-ignore
      validationResult.validatedData.workers = [];
      for (const wid of assignmentData.workerIds) {
        console.log("[VALIDATION] Checking worker:", wid);
        const worker = await workerRepo.findOne({ where: { id: wid } });
        console.log("[VALIDATION] Worker lookup result:", worker);
        if (!worker) {
          validationResult.isValid = false;
          // @ts-ignore
          validationResult.errors.push(`Worker with ID ${wid} not found`);
        } else if (worker.status !== "active") {
          validationResult.isValid = false;
          // @ts-ignore
          validationResult.errors.push(`Worker ${wid} is not active`);
        } else {
          // @ts-ignore
          validationResult.validatedData.workers.push({ id: worker.id, name: worker.name });
        }
      }
    }

    // Pitak validation
    if (assignmentData.pitakId) {
      console.log("[VALIDATION] Checking pitak:", assignmentData.pitakId);
      const pitak = await pitakRepo.findOne({ where: { id: assignmentData.pitakId } });
      console.log("[VALIDATION] Pitak lookup result:", pitak);
      if (!pitak) {
        validationResult.isValid = false;
        // @ts-ignore
        validationResult.errors.push(`Pitak with ID ${assignmentData.pitakId} not found`);
      } else if (pitak.status !== "active") {
        validationResult.isValid = false;
        // @ts-ignore
        validationResult.errors.push(`Pitak ${pitak.id} is not available`);
      } else {
        // @ts-ignore
        validationResult.validatedData.pitak = { id: pitak.id, location: pitak.location };
      }
    }

    // Assignment date validation
    if (assignmentData.assignmentDate) {
      console.log("[VALIDATION] Checking assignmentDate:", assignmentData.assignmentDate);
      const date = new Date(assignmentData.assignmentDate);
      if (isNaN(date.getTime())) {
        validationResult.isValid = false;
        // @ts-ignore
        validationResult.errors.push("Invalid assignment date format");
      } else {
        const today = new Date(); today.setHours(0,0,0,0);
        if (date > today) {
          // @ts-ignore
          validationResult.warnings.push("Assignment date is in the future");
          console.warn("[VALIDATION] Assignment date is in the future:", date);
        }
        // @ts-ignore
        validationResult.validatedData.assignmentDate = date;
      }
    }

    // Luwang count validation
    if (assignmentData.luwangCount !== undefined) {
      console.log("[VALIDATION] Checking luwangCount:", assignmentData.luwangCount);
      const count = parseFloat(assignmentData.luwangCount);
      if (isNaN(count)) {
        validationResult.isValid = false;
        // @ts-ignore
        validationResult.errors.push("Luwang count must be a number");
      } else if (count < 0) {
        validationResult.isValid = false;
        // @ts-ignore
        validationResult.errors.push("Luwang count cannot be negative");
      } else {
        // @ts-ignore
        if (validationResult.validatedData.pitak && validationResult.validatedData.pitak.id) {
          // @ts-ignore
          const pitak = await pitakRepo.findOne({ where: { id: validationResult.validatedData.pitak.id } });
          // @ts-ignore
          if (pitak && pitak.totalLuwang && count > parseFloat(pitak.totalLuwang)) {
            // @ts-ignore
            validationResult.warnings.push("Assigned luwang exceeds pitak capacity");
            console.warn("[VALIDATION] Luwang exceeds pitak capacity:", count, pitak.totalLuwang);
          }
        }
        // @ts-ignore
        validationResult.validatedData.luwangCount = parseFloat(count.toFixed(2));
      }
    }

    // Status validation
    if (assignmentData.status) {
      console.log("[VALIDATION] Checking status:", assignmentData.status);
      if (!AssignmentStatus.includes(assignmentData.status)) {
        validationResult.isValid = false;
        // @ts-ignore
        validationResult.errors.push(`Invalid status. Must be one of: ${AssignmentStatus.join(", ")}`);
      } else {
        // @ts-ignore
        validationResult.validatedData.status = assignmentData.status;
      }
    } else {
      // @ts-ignore
      validationResult.validatedData.status = "active";
    }

    // Existing assignment check (loop sa bawat worker)
    if (checkExisting && assignmentData.workerIds && assignmentData.assignmentDate) {
      for (const wid of assignmentData.workerIds) {
        console.log("[VALIDATION] Checking existing assignment for worker/date:", wid);
        const existingAssignment = await assignmentRepo.findOne({
          where: {
            // @ts-ignore
            worker: { id: wid },
            assignmentDate: new Date(assignmentData.assignmentDate),
            status: "active"
          }
        });
        console.log("[VALIDATION] Existing assignment lookup result:", existingAssignment);
        if (existingAssignment) {
          // @ts-ignore
          validationResult.warnings.push(`Worker ${wid} already has an active assignment for this date`);
          // @ts-ignore
          validationResult.suggestions.push({
            action: "update",
            existingAssignmentId: existingAssignment.id,
            message: `Consider updating the existing assignment for worker ${wid} instead`
          });
        }
      }
    }

    if (validationResult.warnings.length > 0 && validationResult.isValid) {
      // @ts-ignore
      validationResult.suggestions.push({ action: "review", message: "Please review the warnings before proceeding" });
    }

    console.log("[VALIDATION] Final result:", validationResult);

    return {
      status: true,
      message: validationResult.isValid ? "Assignment data is valid" : "Assignment data validation failed",
      data: validationResult
    };

  } catch (error) {
    console.error("Error validating assignment data:", error);
    // @ts-ignore
    return { status: false, message: `Validation failed: ${error.message}`, data: null };
  }
};