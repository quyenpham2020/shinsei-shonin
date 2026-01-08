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

    // 部署の存在確認と現在の情報取得
    const existingDepartment = await getOne<{ id: number; name: string; code: string }>(
      `SELECT id, name, code FROM departments WHERE id = $1`,
      [Number(id)]
    );
    if (!existingDepartment) {
      res.status(404).json({ message: '部署が見つかりません' });
      return;
    }

    // 部署コードの重複チェック（自分以外）
    if (code && code !== existingDepartment.code) {
      const existingByCode = await getOne<{ id: number }>(
        `SELECT id FROM departments WHERE code = $1 AND id != $2`,
        [code, Number(id)]
      );
      if (existingByCode) {
        res.status(400).json({ message: 'この部署コードは既に使用されています' });
        return;
      }
    }

    // 部署名の重複チェック（自分以外）
    if (name && name !== existingDepartment.name) {
      const existingByName = await getOne<{ id: number }>(
        `SELECT id FROM departments WHERE name = $1 AND id != $2`,
        [name, Number(id)]
      );
      if (existingByName) {
        res.status(400).json({ message: 'この部署名は既に使用されています' });
        return;
      }
    }

    // 部署名が変更される場合、古い名前を保存
    const oldName = existingDepartment.name;
    const newName = name || oldName;

    // 部署更新
    await runQuery(`
      UPDATE departments
      SET code = COALESCE($1, code),
          name = COALESCE($2, name),
          description = COALESCE($3, description)
      WHERE id = $4
    `, [code || null, name || null, description !== undefined ? description : null, Number(id)]);

    // CASCADE UPDATE: 部署名が変更された場合、関連するユーザー情報も更新
    if (name && name !== oldName) {
      // 完全一致で更新
      const exactMatchResult = await runQuery(`
        UPDATE users SET department = $1 WHERE department = $2
      `, [newName, oldName]);

      console.log(`[CASCADE UPDATE] Department name changed: "${oldName}" → "${newName}"`);
      console.log(`[CASCADE UPDATE] Exact match: Updated ${exactMatchResult.rowCount} user records`);

      // 完全一致で更新されたユーザーが0件の場合、類似名で検索
      if (exactMatchResult.rowCount === 0) {
        // スペースや大文字小文字の違いを許容して検索
        const similarUsers = await getAll<{ id: number; employee_id: string; department: string }>(
          `SELECT id, employee_id, department FROM users
           WHERE TRIM(LOWER(department)) = TRIM(LOWER($1))`,
          [oldName]
        );

        if (similarUsers.length > 0) {
          console.warn(`[CASCADE UPDATE] ⚠️  WARNING: Found ${similarUsers.length} users with similar department names (case/space differences):`);
          similarUsers.forEach(u => {
            console.warn(`  - User ${u.employee_id}: department = "${u.department}" (should be "${oldName}")`);
          });

          // 類似名も更新
          const fuzzyUpdateResult = await runQuery(`
            UPDATE users SET department = $1
            WHERE TRIM(LOWER(department)) = TRIM(LOWER($2))
          `, [newName, oldName]);

          console.log(`[CASCADE UPDATE] Fuzzy match: Updated ${fuzzyUpdateResult.rowCount} user records with similar names`);
        } else {
          console.warn(`[CASCADE UPDATE] ⚠️  WARNING: No users found with department "${oldName}". No records updated.`);
          console.warn(`[CASCADE UPDATE] This might indicate data inconsistency. Please check user departments manually.`);
        }
      }
    }

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
