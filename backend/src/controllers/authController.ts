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
  must_change_password: number;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      res.status(400).json({ message: req.__('errors.validation.required', { field: req.__('errors.validation.credentials') || 'Credentials' }) });
      return;
    }

    const user = await getOne<User>('SELECT * FROM users WHERE LOWER(employee_id) = LOWER($1)', [employeeId]);

    if (!user) {
      res.status(401).json({ message: req.__('errors.invalidCredentials') });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ message: req.__('errors.invalidCredentials') });
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
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
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
        mustChangePassword: !!user.must_change_password,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: req.__('errors.serverError') || 'Server error occurred' });
  }
};

export const getProfile = (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
};
