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
export const getApplicationTypes = (req: AuthRequest, res: Response): void => {
  try {
    const { includeInactive } = req.query;

    let sql = `
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
    `;

    // 管理者以外またはincludeInactiveがfalseの場合は有効なもののみ
    if (!includeInactive || includeInactive !== 'true') {
      sql += ` WHERE is_active = 1`;
    }

    sql += ` ORDER BY display_order ASC, code ASC`;

    const applicationTypes = getAll<ApplicationType>(sql);
    res.json(applicationTypes);
  } catch (error) {
    console.error('Get application types error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別取得（単一）
export const getApplicationType = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const applicationType = getOne<ApplicationType>(`
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
      WHERE id = ?
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
export const createApplicationType = (req: AuthRequest, res: Response): void => {
  try {
    const { code, name, description, requiresAmount, requiresAttachment, approvalLevels, displayOrder } = req.body;

    // バリデーション
    if (!code || !name) {
      res.status(400).json({ message: '種別コードと種別名は必須です' });
      return;
    }

    // コードの重複チェック
    const existingByCode = getOne(`SELECT id FROM application_types WHERE code = ?`, [code]);
    if (existingByCode) {
      res.status(400).json({ message: 'この種別コードは既に使用されています' });
      return;
    }

    // 申請種別作成
    const result = runQuery(`
      INSERT INTO application_types (code, name, description, requires_amount, requires_attachment, approval_levels, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      code,
      name,
      description || null,
      requiresAmount ? 1 : 0,
      requiresAttachment ? 1 : 0,
      approvalLevels || 1,
      displayOrder || 0
    ]);

    const newApplicationType = getOne<ApplicationType>(`
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
      WHERE id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(newApplicationType);
  } catch (error) {
    console.error('Create application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別更新
export const updateApplicationType = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { code, name, description, requiresAmount, requiresAttachment, approvalLevels, displayOrder, isActive } = req.body;

    // 申請種別の存在確認
    const existing = getOne<{ id: number }>(`SELECT id FROM application_types WHERE id = ?`, [Number(id)]);
    if (!existing) {
      res.status(404).json({ message: '申請種別が見つかりません' });
      return;
    }

    // コードの重複チェック（自分以外）
    if (code) {
      const existingByCode = getOne<{ id: number }>(
        `SELECT id FROM application_types WHERE code = ? AND id != ?`,
        [code, Number(id)]
      );
      if (existingByCode) {
        res.status(400).json({ message: 'この種別コードは既に使用されています' });
        return;
      }
    }

    // 申請種別更新
    runQuery(`
      UPDATE application_types
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          requires_amount = COALESCE(?, requires_amount),
          requires_attachment = COALESCE(?, requires_attachment),
          approval_levels = COALESCE(?, approval_levels),
          display_order = COALESCE(?, display_order),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      code || null,
      name || null,
      description !== undefined ? description : null,
      requiresAmount !== undefined ? (requiresAmount ? 1 : 0) : null,
      requiresAttachment !== undefined ? (requiresAttachment ? 1 : 0) : null,
      approvalLevels || null,
      displayOrder !== undefined ? displayOrder : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      Number(id)
    ]);

    const updatedApplicationType = getOne<ApplicationType>(`
      SELECT id, code, name, description, requires_amount, requires_attachment,
             approval_levels, display_order, is_active, created_at
      FROM application_types
      WHERE id = ?
    `, [Number(id)]);

    res.json(updatedApplicationType);
  } catch (error) {
    console.error('Update application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請種別削除
export const deleteApplicationType = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    // 申請種別の存在確認
    const existing = getOne<{ id: number; code: string }>(`SELECT id, code FROM application_types WHERE id = ?`, [Number(id)]);
    if (!existing) {
      res.status(404).json({ message: '申請種別が見つかりません' });
      return;
    }

    // この種別を使用している申請があるかチェック
    const hasApplications = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM applications WHERE type = ?`,
      [existing.code]
    );
    if (hasApplications && hasApplications.count > 0) {
      res.status(400).json({ message: 'この申請種別を使用している申請があるため削除できません。無効化することをお勧めします。' });
      return;
    }

    // 申請種別削除
    runQuery(`DELETE FROM application_types WHERE id = ?`, [Number(id)]);

    res.json({ message: '申請種別を削除しました' });
  } catch (error) {
    console.error('Delete application type error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
