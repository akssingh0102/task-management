import redis from './redisClient';
import db from '../db';
import pRetry from 'p-retry';
import logger from '../utils/logger';

// Function to create a notification log for the assigned user
const createNotificationLog = async (
  taskId: string,
  userId: string,
  message: string
) => {
  await db.query(
    'INSERT INTO notifications (user_id, task_id, message, created_at) VALUES ($1, $2, $3, NOW())',
    [userId, taskId, message]
  );
};

// Retry wrapper using p-retry
const createNotificationLogWithRetry = async (
  taskId: string,
  userId: string,
  message: string
) => {
  await pRetry(() => createNotificationLog(taskId, userId, message), {
    onFailedAttempt: (error) => {
      console.log(
        `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`
      );
    },
    retries: 3,
  });
};

// Subscribe to the Redis channel 'tasks'
redis.subscribe('tasks', (err, count) => {
  if (err) {
    console.error('Failed to subscribe to tasks channel:', err);
    return;
  }
  console.log(`Subscribed to ${count} Redis channel(s).`);
});

// Process incoming Redis messages
redis.on('message', async (channel, message) => {
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

      // Use the retry wrapper to handle retries
      await createNotificationLogWithRetry(
        task_id,
        assigned_user_id,
        notificationMessage
      );

      console.log(
        `Notification created for user ${assigned_user_id} on task ${task_id}`
      );
    }
  } catch (err) {
    console.error('Failed to process message:', err);
  }
});
