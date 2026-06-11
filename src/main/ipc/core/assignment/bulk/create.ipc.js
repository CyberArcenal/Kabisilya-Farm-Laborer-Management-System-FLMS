// src/main/ipc/assignment/create_bulk.ipc.js
// @ts-check

const { In } = require("typeorm");
const { AppDataSource } = require("../../../../../main/db/datasource");
const Assignment = require("../../../../../entities/Assignment");
const assignmentService = require("../../../../../services/Assignment");
const { logger } = require("../../../../../utils/logger");

// @ts-ignore
module.exports = async function createBulkAssignments(params, queryRunner) {
  try {
    // @ts-ignore
    logger.info("IPC: createBulkAssignments", { params });

    // Validate required fields
    if (
      !params.workerIds ||
      !Array.isArray(params.workerIds) ||
      params.workerIds.length === 0
    ) {
      return {
        status: false,
        message: "workerIds must be a non-empty array",
        data: null,
      };
    }
    if (!params.pitakId) {
      return { status: false, message: "pitakId is required", data: null };
    }
    if (!params.sessionId) {
      return { status: false, message: "sessionId is required", data: null };
    }
    if (!params.assignmentDate) {
      return {
        status: false,
        message: "assignmentDate is required",
        data: null,
      };
    }

    // Ensure AppDataSource is initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    // Fetch all existing assignments for the given pitak, session, and workers
    const existingAssignments = await assignmentRepo.find({
      where: {
        pitak: { id: params.pitakId },
        session: { id: params.sessionId },
        worker: { id: In(params.workerIds) },
      },
      relations: ["worker"], // we only need worker id
    });

    const existingWorkerIds = new Set(
      existingAssignments.map((a) => a.worker.id),
    );

    const created = [];
    const skipped = [];
    const errors = [];

    // Keep track of workers we already created in this batch to avoid duplicates within the same call
    const createdInBatch = new Set();

    for (const workerId of params.workerIds) {
      // Skip if already created in this batch (shouldn't happen with unique workerIds)
      if (createdInBatch.has(workerId)) {
        continue;
      }

      // Skip if already assigned in the database
      if (existingWorkerIds.has(workerId)) {
        skipped.push({
          workerId,
          reason: "Already assigned to this pitak and session",
        });
        continue;
      }

      try {
        const result = await assignmentService.create(
          {
            workerId,
            pitakId: params.pitakId,
            sessionId: params.sessionId,
            assignmentDate: params.assignmentDate,
            notes: params.notes,
          },
          "system",
          queryRunner,
        );
        created.push(result);
        createdInBatch.add(workerId);
      } catch (err) {
        // @ts-ignore
        errors.push({ workerId, message: err.message });
      }
    }

    const responseData = {
      created,
      skipped,
      errors,
      totalRequested: params.workerIds.length,
      totalCreated: created.length,
      totalSkipped: skipped.length,
      totalErrors: errors.length,
    };

    if (errors.length > 0) {
      return {
        status: false,
        message: `Created ${created.length}, skipped ${skipped.length}, failed ${errors.length}`,
        data: responseData,
      };
    }

    return {
      status: true,
      message: `Successfully created ${created.length} assignments (skipped ${skipped.length})`,
      data: responseData,
    };
  } catch (error) {
    // @ts-ignore
    logger.error("IPC: createBulkAssignments error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to create assignments",
      data: null,
    };
  }
};
