import Redis from 'ioredis';
import logger from '../utils/logger';

// Create one Redis instance for publishing and normal commands
const redisPublisher = new Redis({
  host: '127.0.0.1',
  port: 6379,
});

redisPublisher.on('connect', () => {
  console.log('Connected to Redis Publisher');
  logger.info('Connected to Redis Publisher');
});

redisPublisher.on('error', (err) => {
  console.error('Redis Publisher connection error:', err);
  logger.error(`Redis Publisher connection error: ${err}`);
});

// Create a separate Redis instance for subscribing
const redisSubscriber = new Redis({
  host: '127.0.0.1',
  port: 6379,
});

redisSubscriber.on('connect', () => {
  console.log('Connected to Redis Subscriber');
  logger.info('Connected to Redis Subscriber');
});

redisSubscriber.on('error', (err) => {
  console.error('Redis Subscriber connection error:', err);
  logger.error(`Redis Subscriber connection error: ${err}`);
});

// Export both instances
export { redisPublisher, redisSubscriber };
