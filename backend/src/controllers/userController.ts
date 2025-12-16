import { Response } from 'express';
import { getAll } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

// ユーザー一覧取得（管理者用）
export const getUsers = (req: AuthRequest, res: Response): void => {
  try {
    const users = getAll(`
      SELECT id, employee_id, name, email, department, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 承認者一覧取得
export const getApprovers = (req: AuthRequest, res: Response): void => {
  try {
    const approvers = getAll(`
      SELECT id, employee_id, name, email, department
      FROM users
      WHERE role IN ('approver', 'admin')
      ORDER BY name ASC
    `);

    res.json(approvers);
  } catch (error) {
    console.error('Get approvers error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
