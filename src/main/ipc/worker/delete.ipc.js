// ipc/worker/terminate.ipc.js
//@ts-check

const Worker = require("../../../entities/Worker");
const UserActivity = require("../../../entities/UserActivity");
const { AppDataSource } = require("../../db/dataSource");

module.exports = async function terminateWorker(params = {}, queryRunner = null) {
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
    const { id, _userId } = params;

    if (!id) {
      return { status: false, message: "Worker ID is required", data: null };
    }

    // @ts-ignore
    const workerRepository = queryRunner.manager.getRepository(Worker);
    const existingWorker = await workerRepository.findOne({ where: { id: parseInt(id) } });

    if (!existingWorker) {
      return { status: false, message: "Worker not found", data: null };
    }

    // Update status to terminated
    existingWorker.status = "terminated";
    await workerRepository.save(existingWorker);

    // Log activity
    // @ts-ignore
    const activityRepo = queryRunner.manager.getRepository(UserActivity);
    const activity = activityRepo.create({
      user_id: _userId,
      action: "terminate_worker",
      description: `Terminated worker: ${existingWorker.name} (ID: ${id})`,
      ip_address: "127.0.0.1",
      user_agent: "Kabisilya-Management-System",
      created_at: new Date(),
    });
    await activityRepo.save(activity);

    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.commitTransaction();
    }

    return { status: true, message: "Worker terminated successfully", data: { id: parseInt(id) } };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error("Error in terminateWorker:", error);
    // @ts-ignore
    return { status: false, message: `Failed to terminate worker: ${error.message}`, data: null };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};