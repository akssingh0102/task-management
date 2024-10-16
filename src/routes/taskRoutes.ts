// src/routes/taskRoutes.ts
import { Router } from 'express';
import {
  createTask,
  queryTasks,
  updateTask,
} from '../controllers/taskController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/tasks', protect, createTask);
router.put('/tasks/:id', protect, updateTask);
router.get('/tasks/query', queryTasks);

export default router;
