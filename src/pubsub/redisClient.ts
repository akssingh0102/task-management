import Redis from 'ioredis';
import logger from '../utils/logger';

const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
});

redis.on('connect', () => {
  console.log('Connected to Redis');
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  logger.error(`Redis connection error: ${err}`);
});

export default redis;
