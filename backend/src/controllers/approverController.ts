import { Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface Approver {
  id: number;
  user_id: number;
  user_name: string;
  user_employee_id: string;
  department_id: number;
  department_name: string;
  department_code: string;
  approval_level: number;
  max_amount: number | null;
  is_active: number;
  created_at: string;
}

// 承認者一覧取得
export const getApprovers = (req: AuthRequest, res: Response): void => {
  try {
    const { department_id, user_id } = req.query;

    let sql = `
      SELECT
        a.id,
        a.user_id,
        u.name as user_name,
        u.employee_id as user_employee_id,
        a.department_id,
        d.name as department_name,
        d.code as department_code,
        a.approval_level,
        a.max_amount,
        a.is_active,
        a.created_at
      FROM approvers a
      JOIN users u ON a.user_id = u.id
      JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (department_id) {
      sql += ` AND a.department_id = ?`;
      params.push(Number(department_id));
    }

    if (user_id) {
      sql += ` AND a.user_id = ?`;
      params.push(Number(user_id));
    }

    sql += ` ORDER BY u.name ASC, d.code ASC`;

    const approvers = getAll<Approver>(sql, params);
    res.json(approvers);
  } catch (error) {
    console.error('Get approvers error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 承認者取得（単一）
export const getApprover = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const approver = getOne<Approver>(`
      SELECT
        a.id,
        a.user_id,
        u.name as user_name,
        u.employee_id as user_employee_id,
        a.department_id,
        d.name as department_name,
        d.code as department_code,
        a.approval_level,
        a.max_amount,
        a.is_active,
        a.created_at
      FROM approvers a
      JOIN users u ON a.user_id = u.id
      JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `, [Number(id)]);

    if (!approver) {
      res.status(404).json({ message: '承認者設定が見つかりません' });
      return;
    }

    res.json(approver);
  } catch (error) {
    console.error('Get approver error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 承認者作成（ユーザーと部署の割り当て）
export const createApprover = (req: AuthRequest, res: Response): void => {
  try {
    const { userId, departmentId, approvalLevel, maxAmount } = req.body;

    // バリデーション
    if (!userId || !departmentId) {
      res.status(400).json({ message: 'ユーザーと部署は必須です' });
      return;
    }

    // ユーザーの存在確認
    const user = getOne<{ id: number; role: string }>(`SELECT id, role FROM users WHERE id = ?`, [userId]);
    if (!user) {
      res.status(400).json({ message: '指定されたユーザーが存在しません' });
      return;
    }

    // ユーザーがapproverまたはadminロールかチェック
    if (user.role !== 'approver' && user.role !== 'admin') {
      res.status(400).json({ message: '承認者として設定できるのは承認者または管理者ロールのユーザーのみです' });
      return;
    }

    // 部署の存在確認
    const department = getOne<{ id: number }>(`SELECT id FROM departments WHERE id = ?`, [departmentId]);
    if (!department) {
      res.status(400).json({ message: '指定された部署が存在しません' });
      return;
    }

    // 重複チェック
    const existing = getOne(`SELECT id FROM approvers WHERE user_id = ? AND department_id = ?`, [userId, departmentId]);
    if (existing) {
      res.status(400).json({ message: 'この承認者と部署の組み合わせは既に登録されています' });
      return;
    }

    // 承認者作成
    const result = runQuery(`
      INSERT INTO approvers (user_id, department_id, approval_level, max_amount)
      VALUES (?, ?, ?, ?)
    `, [userId, departmentId, approvalLevel || 1, maxAmount || null]);

    const newApprover = getOne<Approver>(`
      SELECT
        a.id,
        a.user_id,
        u.name as user_name,
        u.employee_id as user_employee_id,
        a.department_id,
        d.name as department_name,
        d.code as department_code,
        a.approval_level,
        a.max_amount,
        a.is_active,
        a.created_at
      FROM approvers a
      JOIN users u ON a.user_id = u.id
      JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(newApprover);
  } catch (error) {
    console.error('Create approver error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 承認者更新
export const updateApprover = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { approvalLevel, maxAmount, isActive } = req.body;

    // 承認者設定の存在確認
    const existing = getOne<{ id: number }>(`SELECT id FROM approvers WHERE id = ?`, [Number(id)]);
    if (!existing) {
      res.status(404).json({ message: '承認者設定が見つかりません' });
      return;
    }

    // 承認者更新
    runQuery(`
      UPDATE approvers
      SET approval_level = COALESCE(?, approval_level),
          max_amount = ?,
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      approvalLevel || null,
      maxAmount !== undefined ? maxAmount : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      Number(id)
    ]);

    const updatedApprover = getOne<Approver>(`
      SELECT
        a.id,
        a.user_id,
        u.name as user_name,
        u.employee_id as user_employee_id,
        a.department_id,
        d.name as department_name,
        d.code as department_code,
        a.approval_level,
        a.max_amount,
        a.is_active,
        a.created_at
      FROM approvers a
      JOIN users u ON a.user_id = u.id
      JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `, [Number(id)]);

    res.json(updatedApprover);
  } catch (error) {
    console.error('Update approver error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 承認者削除
export const deleteApprover = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    // 承認者設定の存在確認
    const existing = getOne<{ id: number }>(`SELECT id FROM approvers WHERE id = ?`, [Number(id)]);
    if (!existing) {
      res.status(404).json({ message: '承認者設定が見つかりません' });
      return;
    }

    // 承認者削除
    runQuery(`DELETE FROM approvers WHERE id = ?`, [Number(id)]);

    res.json({ message: '承認者設定を削除しました' });
  } catch (error) {
    console.error('Delete approver error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 承認可能ユーザー一覧取得（承認者/管理者ロールのユーザー）
export const getApproverCandidates = (req: AuthRequest, res: Response): void => {
  try {
    const candidates = getAll<{
      id: number;
      employee_id: string;
      name: string;
      department: string;
      role: string;
    }>(`
      SELECT id, employee_id, name, department, role
      FROM users
      WHERE role IN ('approver', 'admin')
      ORDER BY name ASC
    `);

    res.json(candidates);
  } catch (error) {
    console.error('Get approver candidates error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザーの担当部署一覧取得
export const getApproverDepartments = (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }

    const departments = getAll<{
      department_id: number;
      department_name: string;
      department_code: string;
      approval_level: number;
      max_amount: number | null;
    }>(`
      SELECT
        a.department_id,
        d.name as department_name,
        d.code as department_code,
        a.approval_level,
        a.max_amount
      FROM approvers a
      JOIN departments d ON a.department_id = d.id
      WHERE a.user_id = ? AND a.is_active = 1
      ORDER BY d.code ASC
    `, [userId]);

    res.json(departments);
  } catch (error) {
    console.error('Get approver departments error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
