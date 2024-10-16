import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import logger from '../utils/logger';

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized, no token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    logger.error(`Token verification failed: ${error.message}`);
    res.status(401).json({ error: 'Unauthorized, invalid token' });
    return;
  }
};
