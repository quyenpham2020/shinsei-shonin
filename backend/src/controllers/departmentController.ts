import { Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

// 部署一覧取得
export const getDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activeOnly } = req.query;

    let query = `
      SELECT id, code, name, description, COALESCE(is_active, true) as is_active, created_at
      FROM departments
    `;

    if (activeOnly === 'true') {
      query += ' WHERE COALESCE(is_active, true) = true';
    }

    query += ' ORDER BY code ASC';

    const departments = await getAll<Department>(query);

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 部署取得（単一）
export const getDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const department = await getOne<Department>(`
      SELECT id, code, name, description, created_at
      FROM departments
      WHERE id = $1
    `, [Number(id)]);

    if (!department) {
      res.status(404).json({ message: '部署が見つかりません' });
      return;
    }

    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 部署作成
export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, name, description } = req.body;

    // バリデーション
    if (!code || !name) {
      res.status(400).json({ message: '部署コードと部署名は必須です' });
      return;
    }

    // 部署コードの重複チェック
    const existingByCode = await getOne(`SELECT id FROM departments WHERE code = $1`, [code]);
    if (existingByCode) {
      res.status(400).json({ message: 'この部署コードは既に使用されています' });
      return;
    }

    // 部署作成
    const result = await runQuery(`
      INSERT INTO departments (code, name, description)
      VALUES ($1, $2, $3) RETURNING id
    `, [code, name, description || null]);

    const newDepartment = await getOne<Department>(`
      SELECT id, code, name, description, created_at
      FROM departments
      WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 部署更新
export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, description } = req.body;

    // 部署の存在確認
    const existingDepartment = await getOne<{ id: number }>(`SELECT id FROM departments WHERE id = $1`, [Number(id)]);
    if (!existingDepartment) {
      res.status(404).json({ message: '部署が見つかりません' });
      return;
    }

    // 部署コードの重複チェック（自分以外）
    if (code) {
      const existingByCode = await getOne<{ id: number }>(
        `SELECT id FROM departments WHERE code = $1 AND id != $2`,
        [code, Number(id)]
      );
      if (existingByCode) {
        res.status(400).json({ message: 'この部署コードは既に使用されています' });
        return;
      }
    }

    // 部署更新
    await runQuery(`
      UPDATE departments
      SET code = COALESCE($1, code),
          name = COALESCE($2, name),
          description = COALESCE($3, description)
      WHERE id = $4
    `, [code || null, name || null, description !== undefined ? description : null, Number(id)]);

    const updatedDepartment = await getOne<Department>(`
      SELECT id, code, name, description, created_at
      FROM departments
      WHERE id = $1
    `, [Number(id)]);

    res.json(updatedDepartment);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 部署削除
export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 部署の存在確認
    const existingDepartment = await getOne<{ id: number; name: string }>(`SELECT id, name FROM departments WHERE id = $1`, [Number(id)]);
    if (!existingDepartment) {
      res.status(404).json({ message: '部署が見つかりません' });
      return;
    }

    // この部署に所属するユーザーがいるかチェック
    const hasUsers = await getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE department = $1`,
      [existingDepartment.name]
    );
    if (hasUsers && hasUsers.count > 0) {
      res.status(400).json({ message: 'この部署に所属するユーザーがいるため削除できません' });
      return;
    }

    // 部署削除
    await runQuery(`DELETE FROM departments WHERE id = $1`, [Number(id)]);

    res.json({ message: '部署を削除しました' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
