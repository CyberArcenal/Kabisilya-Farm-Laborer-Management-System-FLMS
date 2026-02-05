// src/ipc/worker/bulk_create.ipc.js
//@ts-check

const Worker = require("../../../entities/Worker");
const UserActivity = require("../../../entities/UserActivity");
const { AppDataSource } = require("../../db/dataSource");

module.exports = async function bulkCreateWorkers(params = {}, queryRunner = null) {
  let shouldRelease = false;

  if (!queryRunner) {
    // @ts-ignore
    queryRunner = AppDataSource.createQueryRunner();
    // @ts-ignore
    await queryRunner.connect();
    // @ts-ignore
    await queryRunner.startTransaction();
    shouldRelease = true;
  }

  try {
    // @ts-ignore
    const { workers, _userId } = params;

    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return {
        status: false,
        message: "Workers array is required and must not be empty",
        data: null,
      };
    }

    // @ts-ignore
    const validWorkers = [];
    const errors = [];

    for (let i = 0; i < workers.length; i++) {
      const workerData = workers[i];

      if (!workerData.name) {
        errors.push(`Worker ${i + 1}: Name is required`);
        continue;
      }

      if (workerData.email) {
        // @ts-ignore
        const duplicateInBatch = validWorkers.some((w) => w.email === workerData.email);
        if (duplicateInBatch) {
          errors.push(`Worker ${i + 1}: Email ${workerData.email} is duplicated in batch`);
          continue;
        }
      }

      validWorkers.push(workerData);
    }

    if (errors.length > 0) {
      return {
        status: false,
        message: "Validation errors found",
        data: { errors },
      };
    }

    // @ts-ignore
    const workerRepository = queryRunner.manager.getRepository(Worker);
    const existingEmails = new Set();

    const emails = validWorkers.map((w) => w.email).filter((email) => email);
    if (emails.length > 0) {
      const existingWorkers = await workerRepository
        .createQueryBuilder("worker")
        .where("worker.email IN (:...emails)", { emails })
        .getMany();

      // @ts-ignore
      existingWorkers.forEach((w) => existingEmails.add(w.email));
    }

    const workersToCreate = validWorkers.filter(
      (worker) => !worker.email || !existingEmails.has(worker.email)
    );

    const workersWithExistingEmails = validWorkers.filter(
      (worker) => worker.email && existingEmails.has(worker.email)
    );

    if (workersWithExistingEmails.length > 0) {
      errors.push(
        ...workersWithExistingEmails.map(
          (w) => `Worker ${w.name}: Email ${w.email} already exists in database`
        )
      );
    }

    const createdWorkers = [];
    const currentDate = new Date();

    for (const workerData of workersToCreate) {
      const worker = workerRepository.create({
        name: workerData.name,
        contact: workerData.contact || null,
        email: workerData.email || null,
        address: workerData.address || null,
        status: workerData.status || "active",
        hireDate: workerData.hireDate ? new Date(workerData.hireDate) : currentDate,
      });

      const savedWorker = await workerRepository.save(worker);
      createdWorkers.push(savedWorker);
    }

    // @ts-ignore
    const activityRepo = queryRunner.manager.getRepository(UserActivity);
    const activity = activityRepo.create({
      user_id: _userId,
      action: "bulk_create_workers",
      description: `Bulk created ${createdWorkers.length} workers`,
      details: JSON.stringify({
        totalRequested: workers.length,
        created: createdWorkers.length,
        skipped: workers.length - createdWorkers.length,
        errors: errors.length > 0 ? errors : null,
      }),
      ip_address: "127.0.0.1",
      user_agent: "Kabisilya-Management-System",
    });
    await activityRepo.save(activity);

    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.commitTransaction();
    }

    return {
      status: true,
      message: `Successfully created ${createdWorkers.length} out of ${workers.length} workers`,
      data: {
        createdWorkers,
        summary: {
          totalRequested: workers.length,
          successfullyCreated: createdWorkers.length,
          skipped: workers.length - createdWorkers.length,
          errors: errors.length > 0 ? errors : null,
        },
      },
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error("Error in bulkCreateWorkers:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to bulk create workers: ${error.message}`,
      data: null,
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};