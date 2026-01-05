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
      const users = await getAll(`
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

      const placeholders = allowedUserIds.map((_, i) => `$${i + 1}`).join(',');
      const users = await getAll(`
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
export const getApprovers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const approvers = await getAll(`
      SELECT id, employee_id, name, email, department
      FROM users
      WHERE role IN ('approver', 'admin', 'gm', 'bod')
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

    const user = await getOne<{
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
      WHERE id = $1
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
    const validRoles = ['user', 'approver', 'admin', 'onsite_leader', 'gm', 'bod'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: '無効なロールです' });
      return;
    }

    // 社員IDの重複チェック
    const existingByEmployeeId = await getOne(`SELECT id FROM users WHERE employee_id = $1`, [employeeId]);
    if (existingByEmployeeId) {
      res.status(400).json({ message: 'この社員IDは既に使用されています' });
      return;
    }

    // メールアドレスの重複チェック
    const existingByEmail = await getOne(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existingByEmail) {
      res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザー作成（初回ログイン時にパスワード変更を強制）
    const result = await runQuery(`
      INSERT INTO users (employee_id, name, email, password, department, role, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id
    `, [employeeId, name, email, hashedPassword, department, role]);

    const newUser = await getOne<{
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
      WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザー更新
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { employeeId, name, email, department, role, weeklyReportExempt } = req.body;

    // ユーザーの存在確認
    const existingUser = await getOne<{ id: number }>(`SELECT id FROM users WHERE id = $1`, [Number(id)]);
    if (!existingUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // 有効なロールかチェック
    const validRoles = ['user', 'approver', 'admin', 'onsite_leader', 'gm', 'bod'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ message: '無効なロールです' });
      return;
    }

    // 社員IDの重複チェック（自分以外）
    if (employeeId) {
      const existingByEmployeeId = await getOne<{ id: number }>(
        `SELECT id FROM users WHERE employee_id = $1 AND id != $2`,
        [employeeId, Number(id)]
      );
      if (existingByEmployeeId) {
        res.status(400).json({ message: 'この社員IDは既に使用されています' });
        return;
      }
    }

    // メールアドレスの重複チェック（自分以外）
    if (email) {
      const existingByEmail = await getOne<{ id: number }>(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [email, Number(id)]
      );
      if (existingByEmail) {
        res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
        return;
      }
    }

    // ユーザー更新
    await runQuery(`
      UPDATE users
      SET employee_id = COALESCE($1, employee_id),
          name = COALESCE($2, name),
          email = COALESCE($3, email),
          department = COALESCE($4, department),
          role = COALESCE($5, role),
          weekly_report_exempt = COALESCE($6, weekly_report_exempt)
      WHERE id = $7
    `, [employeeId || null, name || null, email || null, department || null, role || null, weeklyReportExempt !== undefined ? weeklyReportExempt : null, Number(id)]);

    const updatedUser = await getOne<{
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
      WHERE id = $1
    `, [Number(id)]);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザー削除
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 自分自身を削除しようとしていないかチェック
    if (req.user?.id === Number(id)) {
      res.status(400).json({ message: '自分自身を削除することはできません' });
      return;
    }

    // ユーザーの存在確認
    const existingUser = await getOne<{ id: number; role: string }>(`SELECT id, role FROM users WHERE id = $1`, [Number(id)]);
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
    const hasApplications = await getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM applications WHERE applicant_id = $1`,
      [Number(id)]
    );
    if (hasApplications && hasApplications.count > 0) {
      res.status(400).json({ message: '申請があるユーザーは削除できません' });
      return;
    }

    // ユーザー削除
    await runQuery(`DELETE FROM users WHERE id = $1`, [Number(id)]);

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
    const existingUser = await getOne<{ id: number }>(`SELECT id FROM users WHERE id = $1`, [Number(id)]);
    if (!existingUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワード更新
    await runQuery(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, Number(id)]);

    res.json({ message: 'パスワードを変更しました' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Bulk delete users
export const bulkDeleteUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: '削除するユーザーIDを指定してください' });
      return;
    }

    // Check if trying to delete self
    if (ids.includes(req.user?.id)) {
      res.status(400).json({ message: '自分自身を削除することはできません' });
      return;
    }

    // Check for admin users
    const adminUsers = await getAll<{ id: number }>(`SELECT id FROM users WHERE id = ANY($1) AND role = 'admin'`, [ids]);
    if (adminUsers.length > 0) {
      res.status(400).json({ message: '管理者ユーザーは削除できません' });
      return;
    }

    // Check for users with applications
    const usersWithApps = await getAll<{ id: number }>(`SELECT DISTINCT applicant_id as id FROM applications WHERE applicant_id = ANY($1)`, [ids]);
    if (usersWithApps.length > 0) {
      res.status(400).json({ message: '申請があるユーザーは削除できません' });
      return;
    }

    // Delete users
    const result = await runQuery(`DELETE FROM users WHERE id = ANY($1)`, [ids]);

    res.json({ message: `${result.rowCount}件のユーザーを削除しました` });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
