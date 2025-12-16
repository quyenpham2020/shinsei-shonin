import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    employeeId: string;
    name: string;
    email: string;
    department: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: '認証トークンが必要です' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: '無効なトークンです' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'この操作を行う権限がありません' });
      return;
    }

    next();
  };
};
