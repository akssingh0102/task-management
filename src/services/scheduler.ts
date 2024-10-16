import cron from 'node-cron';
import redis from '../pubsub/redisClient';
import db from '../db';
import logger from '../utils/logger';
import { REDIS_CHANNEL, REDIS_EVENTS } from '../utils/constants';

// Function to find tasks due tomorrow
const getTasksDueTomorrow = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); // Set date to tomorrow

  const startOfDay = new Date(tomorrow.setHours(0, 0, 0, 0)); // Start of tomorrow
  const endOfDay = new Date(tomorrow.setHours(23, 59, 59, 999)); // End of tomorrow

  const query = `
    SELECT id, title, assigned_user_id, due_date FROM tasks 
    WHERE due_date >= $1 AND due_date <= $2 AND status != 'completed';
  `;

  const result = await db.query(query, [startOfDay, endOfDay]);
  return result.rows;
};

const notifyUsersOfDueTasks = async () => {
  try {
    const tasksDueTomorrow = await getTasksDueTomorrow();

    if (tasksDueTomorrow.length === 0) {
      logger.info('No tasks are due tomorrow.');
      return;
    }

    for (const task of tasksDueTomorrow) {
      const notificationMessage = `Reminder: The task "${task.title}" is due tomorrow. Please complete it on time.`;

      await db.query(
        `INSERT INTO notifications (user_id, task_id, message, created_at) 
           VALUES ($1, $2, $3, NOW())`,
        [task.assigned_user_id, task.id, notificationMessage]
      );

      logger.info(
        `Notification entry created for task "${task.title}" due tomorrow for user ${task.assigned_user_id}`
      );
    }
  } catch (error) {
    logger.error(
      `Failed to create notifications for tasks due tomorrow: ${error}`
    );
  }
};

// Schedule the cron job to run every day at 8 AM
cron.schedule('0 8 * * *', async () => {
  logger.info(
    'Running daily scheduled task to notify users of tasks due tomorrow...'
  );
  await notifyUsersOfDueTasks();
});
