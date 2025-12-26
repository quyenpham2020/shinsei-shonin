import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface Favorite {
  id: number;
  user_id: number;
  application_id: number;
  created_at: string;
}

// お気に入り切り替え（追加/削除）
export const toggleFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { applicationId } = req.params;
    const user = req.user!;

    // 申請の存在確認
    const application = getOne('SELECT id FROM applications WHERE id = ?', [Number(applicationId)]);
    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // 既にお気に入りかチェック
    const existing = getOne<Favorite>(
      'SELECT * FROM favorites WHERE user_id = ? AND application_id = ?',
      [user.id, Number(applicationId)]
    );

    if (existing) {
      // 削除
      runQuery(
        'DELETE FROM favorites WHERE user_id = ? AND application_id = ?',
        [user.id, Number(applicationId)]
      );
      res.json({ is_favorite: false, message: 'お気に入りから削除しました' });
    } else {
      // 追加
      runQuery(
        'INSERT INTO favorites (user_id, application_id) VALUES (?, ?)',
        [user.id, Number(applicationId)]
      );
      res.json({ is_favorite: true, message: 'お気に入りに追加しました' });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザーのお気に入り一覧取得
export const getUserFavorites = (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;

    const favorites = getAll(`
      SELECT
        a.*,
        u1.name as applicant_name,
        u1.department as applicant_department,
        u2.name as approver_name,
        f.created_at as favorited_at
      FROM favorites f
      JOIN applications a ON f.application_id = a.id
      LEFT JOIN users u1 ON a.applicant_id = u1.id
      LEFT JOIN users u2 ON a.approver_id = u2.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [user.id]);

    res.json(favorites);
  } catch (error) {
    console.error('Get user favorites error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// お気に入り状態チェック
export const checkFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { applicationId } = req.params;
    const user = req.user!;

    const existing = getOne<Favorite>(
      'SELECT * FROM favorites WHERE user_id = ? AND application_id = ?',
      [user.id, Number(applicationId)]
    );

    res.json({ is_favorite: !!existing });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// お気に入り削除
export const removeFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { applicationId } = req.params;
    const user = req.user!;

    const existing = getOne<Favorite>(
      'SELECT * FROM favorites WHERE user_id = ? AND application_id = ?',
      [user.id, Number(applicationId)]
    );

    if (!existing) {
      res.status(404).json({ message: 'お気に入りが見つかりません' });
      return;
    }

    runQuery(
      'DELETE FROM favorites WHERE user_id = ? AND application_id = ?',
      [user.id, Number(applicationId)]
    );

    res.json({ message: 'お気に入りから削除しました' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
