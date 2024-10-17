import { redisSubscriber } from './redisClient';
import db from '../db';
import retry from 'retry'; // Import the retry package
import logger from '../utils/logger';

export const taskSubscriber = () => {
  const createNotificationLog = async (
    taskId: string,
    userId: string,
    message: string
  ) => {
    try {
      await db.query(
        'INSERT INTO notifications (user_id, task_id, message, created_at) VALUES ($1, $2, $3, NOW())',
        [userId, taskId, message]
      );
      logger.info(
        `Notification log created for user ${userId} on task ${taskId}: ${message}`
      );
    } catch (error: any) {
      logger.error(
        `Failed to create notification log for user ${userId} on task ${taskId}: ${error.message}`
      );
      throw error;
    }
  };

  const createNotificationLogWithRetry = async (
    taskId: string,
    userId: string,
    message: string
  ) => {
    const operation = retry.operation({
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
    });

    operation.attempt(async (currentAttempt) => {
      try {
        await createNotificationLog(taskId, userId, message);
        logger.info(
          `Successfully created notification log for user ${userId} on task ${taskId} (Attempt: ${currentAttempt})`
        );
      } catch (error: any) {
        if (operation.retry(error)) {
          logger.warn(
            `Attempt ${currentAttempt} to create notification log for user ${userId} on task ${taskId} failed. Retries left: ${operation.attempts()}.`
          );
          return;
        }

        logger.error(
          `Failed to create notification log for user ${userId} on task ${taskId} after multiple attempts: ${error.message}`
        );
      }
    });
  };

  redisSubscriber.subscribe('tasks', (err, count) => {
    if (err) {
      logger.error('Failed to subscribe to tasks channel:', err);
      return;
    }
    logger.info(`Subscribed to ${count} Redis channel(s).`);
  });

  redisSubscriber.on('message', async (channel, message) => {
    try {
      const parsedMessage = JSON.parse(message);

      if (channel === 'tasks') {
        const { event, task_id, assigned_user_id, status } = parsedMessage;

        let notificationMessage = '';

        if (event === 'task_created') {
          notificationMessage = `A new task has been created with status: ${status}.`;
        } else if (event === 'task_updated') {
          notificationMessage = `Task status has been updated to: ${status}.`;
        }

        await createNotificationLogWithRetry(
          task_id,
          assigned_user_id,
          notificationMessage
        );

        logger.info(
          `Notification created for user ${assigned_user_id} on task ${task_id}`
        );
      }
    } catch (err) {
      logger.error('Failed to process message:', err);
    }
  });
};
