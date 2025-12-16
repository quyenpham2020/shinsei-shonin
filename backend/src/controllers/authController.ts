import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne } from '../config/database';
import { config } from '../config/env';
import { AuthRequest } from '../middlewares/auth';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      res.status(400).json({ message: '社員IDとパスワードを入力してください' });
      return;
    }

    const user = getOne<User>('SELECT * FROM users WHERE employee_id = ?', [employeeId]);

    if (!user) {
      res.status(401).json({ message: '社員IDまたはパスワードが正しくありません' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ message: '社員IDまたはパスワードが正しくありません' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        employeeId: user.employee_id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        employeeId: user.employee_id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getProfile = (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
};
