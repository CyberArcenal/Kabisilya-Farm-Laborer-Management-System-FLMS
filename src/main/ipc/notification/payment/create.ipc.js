// ipc/notification/payment/create.ipc.js
//@ts-check

const Notification = require("../../../../entities/Notification");
const UserActivity = require("../../../../entities/UserActivity");
const { AppDataSource } = require("../../../db/dataSource");

module.exports = async function createPaymentNotification(
  params = {},
  queryRunner = null,
) {
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
    const {
      // @ts-ignore
      paymentId,
      // @ts-ignore
      workerId,
      // @ts-ignore
      workerName,
      // @ts-ignore
      amount,
      // @ts-ignore
      status,
      // @ts-ignore
      message,
      // @ts-ignore
      context = {},
      // @ts-ignore
      _userId,
    } = params;

    if (!paymentId || !status || !message) {
      return {
        status: false,
        message: "Payment ID, status, and message are required",
        data: null,
      };
    }

    // Create payment notification
    // @ts-ignore
    const notification = queryRunner.manager.create(Notification, {
      type: "payment",
      context: {
        paymentId,
        workerId,
        workerName: workerName || `Worker ${workerId}`,
        amount: amount || 0,
        status, // 'created', 'processing', 'completed', 'failed', 'cancelled'
        message,
        timestamp: new Date().toISOString(),
        ...context,
      },
      timestamp: new Date(),
    });

    // @ts-ignore
    const savedNotification = await queryRunner.manager.save(notification);

    // Log activity
    // @ts-ignore
    const activityRepo = queryRunner.manager.getRepository(UserActivity);
    const activity = activityRepo.create({
      user_id: _userId,
      action: "create_payment_notification",
      description: `Created payment notification for payment ID: ${paymentId}`,
      ip_address: "127.0.0.1",
      user_agent: "Kabisilya-Management-System",
      created_at: new Date(),
    });
    await activityRepo.save(activity);

    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.commitTransaction();
    }

    return {
      status: true,
      message: "Payment notification created successfully",
      data: { notification: savedNotification },
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error("Error in createPaymentNotification:", error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to create payment notification: ${error.message}`,
      data: null,
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};
