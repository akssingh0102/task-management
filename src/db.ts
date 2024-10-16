import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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
