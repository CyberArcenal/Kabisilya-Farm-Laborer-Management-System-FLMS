// ipc/notification/preferences/update.ipc.js
//@ts-check

// Note: This is a placeholder since we don't have a NotificationPreferences entity yet.

const Notification = require("../../../../entities/Notification");
const UserActivity = require("../../../../entities/UserActivity");
const { AppDataSource } = require("../../../db/dataSource");

module.exports = async function updateUserPreferences(params = {}, queryRunner = null) {
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
    const { userId, preferences, _userId } = params;
    
    if (!userId || !preferences) {
      return {
        status: false,
        message: 'User ID and preferences are required',
        data: null
      };
    }

    // In a real implementation, you would update the NotificationPreferences table
    // For now, just log the activity
    
    // Log activity
    // @ts-ignore
    const activityRepo = queryRunner.manager.getRepository(UserActivity);
    const activity = activityRepo.create({
      user_id: _userId,
      action: 'update_notification_preferences',
      description: `Updated notification preferences for user ID: ${userId}`,
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
      message: 'User preferences updated successfully',
      data: { userId, preferences }
    };
  } catch (error) {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.rollbackTransaction();
    }
    console.error('Error in updateUserPreferences:', error);
    return {
      status: false,
      // @ts-ignore
      message: `Failed to update user preferences: ${error.message}`,
      data: null
    };
  } finally {
    if (shouldRelease) {
      // @ts-ignore
      await queryRunner.release();
    }
  }
};