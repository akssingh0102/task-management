import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from './utils/logger';

dotenv.config();

logger.info(
  `host: ${process.env.DATABASE_HOST}\ndatabase: ${process.env.DATABASE_NAME}\nuser: ${process.env.DATABASE_USER}\npass: ${process.env.DATABASE_PASSWORD}`
);
const db = new Pool({
  host: process.env.DATABASE_HOST,
  port: 5432,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

db.connect()
  .then(() => {
    console.log('Connected to the database successfully!');
  })
  .catch((err: any) => {
    console.error('Database connection error:', err.message);
  });

export default db;
