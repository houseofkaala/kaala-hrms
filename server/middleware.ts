import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getUserById } from './db';

const sessions = new Map<string, string>();

export interface AuthedRequest extends Request {
  userId?: string;
}

export function createSession(userId: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, userId);
  return token;
}

export function deleteSession(token: string) {
  sessions.delete(token);
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const userId = sessions.get(authHeader.slice(7));
  if (!userId) return res.status(401).json({ error: 'Invalid or expired session' });
  req.userId = userId;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = getUserById(req.userId!);
    if (!user || !roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}