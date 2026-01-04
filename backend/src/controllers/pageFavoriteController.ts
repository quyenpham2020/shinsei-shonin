import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface PageFavorite {
  id: number;
  user_id: number;
  page_path: string;
  page_name: string;
  created_at: string;
}

// ページお気に入り追加
export const addPageFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page_path, page_name } = req.body;
    const user = req.user!;

    if (!page_path || !page_name) {
      res.status(400).json({ message: 'ページパスとページ名は必須です' });
      return;
    }

    // 既に登録済みかチェック
    const existing = await getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = $1 AND page_path = $2',
      [user.id, page_path]
    );

    if (existing) {
      res.status(400).json({ message: '既にお気に入りに登録されています' });
      return;
    }

    const result = await runQuery(
      'INSERT INTO page_favorites (user_id, page_path, page_name) VALUES ($1, $2, $3) RETURNING id',
      [user.id, page_path, page_name]
    );

    const newFavorite = await getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json(newFavorite);
  } catch (error) {
    console.error('Add page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ページお気に入り削除
export const removePageFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page_path } = req.body;
    const user = req.user!;

    if (!page_path) {
      res.status(400).json({ message: 'ページパスは必須です' });
      return;
    }

    const existing = await getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = $1 AND page_path = $2',
      [user.id, page_path]
    );

    if (!existing) {
      res.status(404).json({ message: 'お気に入りが見つかりません' });
      return;
    }

    await runQuery(
      'DELETE FROM page_favorites WHERE user_id = $1 AND page_path = $2',
      [user.id, page_path]
    );

    res.json({ message: 'お気に入りから削除しました' });
  } catch (error) {
    console.error('Remove page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ページお気に入り切り替え
export const togglePageFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page_path, page_name } = req.body;
    const user = req.user!;

    if (!page_path || !page_name) {
      res.status(400).json({ message: 'ページパスとページ名は必須です' });
      return;
    }

    const existing = await getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = $1 AND page_path = $2',
      [user.id, page_path]
    );

    if (existing) {
      // 削除
      await runQuery(
        'DELETE FROM page_favorites WHERE user_id = $1 AND page_path = $2',
        [user.id, page_path]
      );
      res.json({ is_favorite: false, message: 'お気に入りから削除しました' });
    } else {
      // 追加
      await runQuery(
        'INSERT INTO page_favorites (user_id, page_path, page_name) VALUES ($1, $2, $3)',
        [user.id, page_path, page_name]
      );
      res.json({ is_favorite: true, message: 'お気に入りに追加しました' });
    }
  } catch (error) {
    console.error('Toggle page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザーのページお気に入り一覧取得
export const getPageFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const favorites = await getAll<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    res.json(favorites);
  } catch (error) {
    console.error('Get page favorites error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ページお気に入り状態チェック
export const checkPageFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page_path } = req.query;
    const user = req.user!;

    if (!page_path) {
      res.status(400).json({ message: 'ページパスは必須です' });
      return;
    }

    const existing = await getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = $1 AND page_path = $2',
      [user.id, page_path as string]
    );

    res.json({ is_favorite: !!existing });
  } catch (error) {
    console.error('Check page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
