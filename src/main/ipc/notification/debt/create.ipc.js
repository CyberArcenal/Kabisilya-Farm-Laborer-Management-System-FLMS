// ipc/notification/debt/create.ipc.js
//@ts-check

const Notification = require("../../../../entities/Notification");
const UserActivity = require("../../../../entities/UserActivity");
const { AppDataSource } = require("../../../db/dataSource");

module.exports = async function createDebtNotification(params = {}, queryRunner = null) {
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
    const { debtId, workerId, workerName, amount, status, message, context = {}, _userId } = params;
    
    if (!debtId || !status || !message) {
      return {
        status: false,
        message: 'Debt ID, status, and message are required',
        data: null
      };
    }

    // Create debt notification
    // @ts-ignore
    const notification = queryRunner.manager.create(Notification, {
      type: 'debt',
      context: {
        debtId,
        workerId,
        workerName: workerName || `Worker ${workerId}`,
        amount: amount || 0,
        status, // 'created', 'updated', 'payment_received', 'overdue', 'settled'
        message,
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
      action: 'create_debt_notification',
      description: `Created debt notification for debt ID: ${debtId}`,
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
      message: 'Debt notification created successfully',
      data: { notification: savedNotification }
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error('Error in createDebtNotification:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to create debt notification: ${error.message}`,
      data: null
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};