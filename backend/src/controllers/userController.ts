import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getAll, getOne, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { getUsersUnderAuthority } from '../services/permissionService';

// ユーザー一覧取得（管理者用）
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // Admin, BOD, and GM see all users
    if (user.role === 'admin' || user.role === 'bod' || user.role === 'gm') {
      const users = getAll(`
        SELECT id, employee_id, name, email, department, role, weekly_report_exempt, created_at
        FROM users
        ORDER BY department ASC, name ASC
      `);
      res.json(users);
      return;
    }

    // Onsite leader sees only their team members
    if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        // Onsite leader has no team members
        res.json([]);
        return;
      }

      const placeholders = allowedUserIds.map(() => '?').join(',');
      const users = getAll(`
        SELECT id, employee_id, name, email, department, role, weekly_report_exempt, created_at
        FROM users
        WHERE id IN (${placeholders})
        ORDER BY department ASC, name ASC
      `, allowedUserIds);

      res.json(users);
      return;
    }

    // Other roles (approver, user) should not access this endpoint
    res.status(403).json({ message: '権限がありません' });
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

// ユーザー取得（単一）
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const targetUserId = Number(id);

    // Onsite leader can only view their team members
    if (currentUser.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(currentUser.id);

      if (!allowedUserIds.includes(targetUserId)) {
        res.status(403).json({ message: '権限がありません' });
        return;
      }
    }

    const user = getOne<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
      role: string;
      created_at: string;
    }>(`
      SELECT id, employee_id, name, email, department, role, created_at
      FROM users
      WHERE id = ?
    `, [targetUserId]);

    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザー作成
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, name, email, password, department, role } = req.body;

    // バリデーション
    if (!employeeId || !name || !email || !password || !department || !role) {
      res.status(400).json({ message: '必須項目を入力してください' });
      return;
    }

    // 有効なロールかチェック
    const validRoles = ['user', 'approver', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: '無効なロールです' });
      return;
    }

    // 社員IDの重複チェック
    const existingByEmployeeId = getOne(`SELECT id FROM users WHERE employee_id = ?`, [employeeId]);
    if (existingByEmployeeId) {
      res.status(400).json({ message: 'この社員IDは既に使用されています' });
      return;
    }

    // メールアドレスの重複チェック
    const existingByEmail = getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingByEmail) {
      res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザー作成（初回ログイン時にパスワード変更を強制）
    const result = runQuery(`
      INSERT INTO users (employee_id, name, email, password, department, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [employeeId, name, email, hashedPassword, department, role]);

    const newUser = getOne<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
      role: string;
      created_at: string;
    }>(`
      SELECT id, employee_id, name, email, department, role, created_at
      FROM users
      WHERE id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザー更新
export const updateUser = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { employeeId, name, email, department, role, weeklyReportExempt } = req.body;

    // ユーザーの存在確認
    const existingUser = getOne<{ id: number }>(`SELECT id FROM users WHERE id = ?`, [Number(id)]);
    if (!existingUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // 有効なロールかチェック
    const validRoles = ['user', 'approver', 'admin'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ message: '無効なロールです' });
      return;
    }

    // 社員IDの重複チェック（自分以外）
    if (employeeId) {
      const existingByEmployeeId = getOne<{ id: number }>(
        `SELECT id FROM users WHERE employee_id = ? AND id != ?`,
        [employeeId, Number(id)]
      );
      if (existingByEmployeeId) {
        res.status(400).json({ message: 'この社員IDは既に使用されています' });
        return;
      }
    }

    // メールアドレスの重複チェック（自分以外）
    if (email) {
      const existingByEmail = getOne<{ id: number }>(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [email, Number(id)]
      );
      if (existingByEmail) {
        res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
        return;
      }
    }

    // ユーザー更新
    runQuery(`
      UPDATE users
      SET employee_id = COALESCE(?, employee_id),
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          department = COALESCE(?, department),
          role = COALESCE(?, role),
          weekly_report_exempt = COALESCE(?, weekly_report_exempt)
      WHERE id = ?
    `, [employeeId || null, name || null, email || null, department || null, role || null, weeklyReportExempt !== undefined ? (weeklyReportExempt ? 1 : 0) : null, Number(id)]);

    const updatedUser = getOne<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
      role: string;
      created_at: string;
    }>(`
      SELECT id, employee_id, name, email, department, role, created_at
      FROM users
      WHERE id = ?
    `, [Number(id)]);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザー削除
export const deleteUser = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    // 自分自身を削除しようとしていないかチェック
    if (req.user?.id === Number(id)) {
      res.status(400).json({ message: '自分自身を削除することはできません' });
      return;
    }

    // ユーザーの存在確認
    const existingUser = getOne<{ id: number; role: string }>(`SELECT id, role FROM users WHERE id = ?`, [Number(id)]);
    if (!existingUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // 管理者ユーザーは削除不可
    if (existingUser.role === 'admin') {
      res.status(400).json({ message: '管理者ユーザーは削除できません' });
      return;
    }

    // 申請があるユーザーかチェック
    const hasApplications = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM applications WHERE applicant_id = ?`,
      [Number(id)]
    );
    if (hasApplications && hasApplications.count > 0) {
      res.status(400).json({ message: '申請があるユーザーは削除できません' });
      return;
    }

    // ユーザー削除
    runQuery(`DELETE FROM users WHERE id = ?`, [Number(id)]);

    res.json({ message: 'ユーザーを削除しました' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// パスワード変更
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'パスワードは6文字以上で入力してください' });
      return;
    }

    // ユーザーの存在確認
    const existingUser = getOne<{ id: number }>(`SELECT id FROM users WHERE id = ?`, [Number(id)]);
    if (!existingUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワード更新
    runQuery(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, Number(id)]);

    res.json({ message: 'パスワードを変更しました' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
