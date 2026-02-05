// ipc/worker/delete.ipc.js
//@ts-check

const Worker = require("../../../entities/Worker");
const UserActivity = require("../../../entities/UserActivity");
const { AppDataSource } = require("../../db/dataSource");

module.exports = async function deleteWorker(params = {}, queryRunner = null) {
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
      return {
        status: false,
        message: 'Worker ID is required',
        data: null
      };
    }

    // @ts-ignore
    const workerRepository = queryRunner.manager.getRepository(Worker);
    const existingWorker = await workerRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!existingWorker) {
      return {
        status: false,
        message: 'Worker not found',
        data: null
      };
    }

    // Check if worker has any financial records? (Optional: you might want to prevent deletion if there are debts or payments)
    // We'll just delete as per cascade rules defined in the entity.

    // @ts-ignore
    await queryRunner.manager.remove(existingWorker);
    
    // Log activity
    // @ts-ignore
    const activityRepo = queryRunner.manager.getRepository(UserActivity);
    const activity = activityRepo.create({
      user_id: _userId,
      action: 'delete_worker',
      description: `Deleted worker: ${existingWorker.name} (ID: ${id})`,
      ip_address: "127.0.0.1",
      user_agent: "Kabisilya-Management-System",
      created_at: new Date()
    });
    await activityRepo.save(activity);

    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.commitTransaction();
    }

    return {
      status: true,
      message: 'Worker deleted successfully',
      data: { id: parseInt(id) }
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error('Error in deleteWorker:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to delete worker: ${error.message}`,
      data: null
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};