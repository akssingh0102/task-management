// src/routes/taskRoutes.ts
import { Router } from 'express';
import {
  createTask,
  queryTasks,
  updateTask,
} from '../controllers/taskController';

const router = Router();

router.post('/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.get('/tasks/query', queryTasks);

export default router;
