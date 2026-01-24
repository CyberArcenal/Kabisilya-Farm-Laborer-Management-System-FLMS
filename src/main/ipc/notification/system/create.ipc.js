// ipc/notification/system/create.ipc.js
//@ts-check

const Notification = require("../../../../entities/Notification");
const UserActivity = require("../../../../entities/UserActivity");
const { AppDataSource } = require("../../../db/dataSource");

module.exports = async function createSystemNotification(params = {}, queryRunner = null) {
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
    const { title, message, priority = "medium", context = {}, _userId } = params;
    
    if (!title || !message) {
      return {
        status: false,
        message: 'Title and message are required for system notifications',
        data: null
      };
    }

    // Create system notification
    // @ts-ignore
    const notification = queryRunner.manager.create(Notification, {
      type: 'system',
      context: {
        title,
        message,
        priority,
        timestamp: new Date().toISOString(),
        ...context
      },
      timestamp: new Date()
    });

    // @ts-ignore
    const savedNotification = await queryRunner.manager.save(notification);
    
    // Log activity
    // @ts-ignore
    const activityRepo = queryRunner.manager.getRepository(UserActivity);
    const activity = activityRepo.create({
      user_id: _userId,
      action: 'create_system_notification',
      description: `Created system notification: ${title}`,
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
      message: 'System notification created successfully',
      data: { notification: savedNotification }
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error('Error in createSystemNotification:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to create system notification: ${error.message}`,
      data: null
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};