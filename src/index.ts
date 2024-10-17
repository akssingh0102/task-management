// src/index.ts
import express from 'express';
import morgan from 'morgan';
import taskRoutes from './routes/taskRoutes';
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';
import logger from './utils/logger';
import './services/scheduler';
import { taskSubscriber } from './pubsub/taskSubscriber';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

const stream: { write: (message: string) => void } = {
  write: (message: string) => logger.info(message.trim()),
};

app.use(morgan('combined', { stream }));

// Routes
app.use('/api', taskRoutes);
app.use('/auth', authRoutes);

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(err.message, { stack: err.stack });
    res
      .status(500)
      .json({ message: 'Something went wrong', error: err.message });
  }
);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  taskSubscriber();
});
