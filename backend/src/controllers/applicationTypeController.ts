import { Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface ApplicationType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  requires_amount: number;
  requires_attachment: number;
  approval_levels: number;
  display_order: number;
  is_active: number;
  created_at: string;
}

// 申請種別一覧取得
export const getApplicationTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;

    let sql = `
      SELECT id, code, name, description, requires_amount,
             is_active, created_at
      FROM application_types
    `;

    // 管理者以外またはincludeInactiveがfalseの場合は有効なもののみ
    if (!includeInactive || includeInactive !== 'true') {
      sql += ` WHERE is_active = true`;
    }

    sql += ` ORDER BY code ASC`;

    const applicationTypes = await getAll<ApplicationType>(sql);
    res.json(applicationTypes);
  } catch (error) {
    console.error('Get application types error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別取得（単一）
export const getApplicationType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const applicationType = await getOne<ApplicationType>(`
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
      WHERE id = $1
    `, [Number(id)]);

    if (!applicationType) {
      res.status(404).json({ message: '申請種別が見つかりません' });
      return;
    }

    res.json(applicationType);
  } catch (error) {
    console.error('Get application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別作成
export const createApplicationType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, name, description, requiresAmount, requiresAttachment, approvalLevels, displayOrder } = req.body;

    // バリデーション
    if (!code || !name) {
      res.status(400).json({ message: '種別コードと種別名は必須です' });
      return;
    }

    // コードの重複チェック
    const existingByCode = await getOne(`SELECT id FROM application_types WHERE code = $1`, [code]);
    if (existingByCode) {
      res.status(400).json({ message: 'この種別コードは既に使用されています' });
      return;
    }

    // 申請種別作成
    const result = await runQuery(`
      INSERT INTO application_types (code, name, description, requires_amount, requires_attachment, approval_levels, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [
      code,
      name,
      description || null,
      requiresAmount ? true : false,
      requiresAttachment ? true : false,
      approvalLevels || 1,
      displayOrder || 0
    ]);

    const newApplicationType = await getOne<ApplicationType>(`
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
      WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newApplicationType);
  } catch (error) {
    console.error('Create application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別更新
export const updateApplicationType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, description, requiresAmount, requiresAttachment, approvalLevels, displayOrder, isActive } = req.body;

    // 申請種別の存在確認
    const existing = await getOne<{ id: number }>(`SELECT id FROM application_types WHERE id = $1`, [Number(id)]);
    if (!existing) {
      res.status(404).json({ message: '申請種別が見つかりません' });
      return;
    }

    // コードの重複チェック（自分以外）
    if (code) {
      const existingByCode = await getOne<{ id: number }>(
        `SELECT id FROM application_types WHERE code = $1 AND id != $2`,
        [code, Number(id)]
      );
      if (existingByCode) {
        res.status(400).json({ message: 'この種別コードは既に使用されています' });
        return;
      }
    }

    // 申請種別更新
    await runQuery(`
      UPDATE application_types
      SET code = COALESCE($1, code),
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          requires_amount = COALESCE($4, requires_amount),
          requires_attachment = COALESCE($5, requires_attachment),
          approval_levels = COALESCE($6, approval_levels),
          display_order = COALESCE($7, display_order),
          is_active = COALESCE($8, is_active)
      WHERE id = $9
    `, [
      code || null,
      name || null,
      description !== undefined ? description : null,
      requiresAmount !== undefined ? (requiresAmount ? true : false) : null,
      requiresAttachment !== undefined ? (requiresAttachment ? true : false) : null,
      approvalLevels || null,
      displayOrder !== undefined ? displayOrder : null,
      isActive !== undefined ? (isActive ? true : false) : null,
      Number(id)
    ]);

    const updatedApplicationType = await getOne<ApplicationType>(`
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
      WHERE id = $1
    `, [Number(id)]);

    res.json(updatedApplicationType);
  } catch (error) {
    console.error('Update application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別削除
export const deleteApplicationType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 申請種別の存在確認
    const existing = await getOne<{ id: number; code: string }>(`SELECT id, code FROM application_types WHERE id = $1`, [Number(id)]);
    if (!existing) {
      res.status(404).json({ message: '申請種別が見つかりません' });
      return;
    }

    // この種別を使用している申請があるかチェック
    const hasApplications = await getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM applications WHERE type = $1`,
      [existing.code]
    );
    if (hasApplications && hasApplications.count > 0) {
      res.status(400).json({ message: 'この申請種別を使用している申請があるため削除できません。無効化することをお勧めします。' });
      return;
    }

    // 申請種別削除
    await runQuery(`DELETE FROM application_types WHERE id = $1`, [Number(id)]);

    res.json({ message: '申請種別を削除しました' });
  } catch (error) {
    console.error('Delete application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
