// src/routes/taskRoutes.ts
import { Router } from 'express';
import { login, register } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.put('/login', login);

export default router;
