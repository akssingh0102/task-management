import { JwtPayload } from 'jsonwebtoken';

// Extend the Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}
