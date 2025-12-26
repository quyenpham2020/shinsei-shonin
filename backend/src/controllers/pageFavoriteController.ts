import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface PageFavorite {
  id: number;
  user_id: number;
  url: string;
  title: string;
  icon: string | null;
  created_at: string;
}

// ページお気に入り追加
export const addPageFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { url, title, icon } = req.body;
    const user = req.user!;

    if (!url || !title) {
      res.status(400).json({ message: 'URLとタイトルは必須です' });
      return;
    }

    // 既に登録済みかチェック
    const existing = getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = ? AND url = ?',
      [user.id, url]
    );

    if (existing) {
      res.status(400).json({ message: '既にお気に入りに登録されています' });
      return;
    }

    const result = runQuery(
      'INSERT INTO page_favorites (user_id, url, title, icon) VALUES (?, ?, ?, ?)',
      [user.id, url, title, icon || null]
    );

    const newFavorite = getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE id = ?',
      [result.lastInsertRowid]
    );

    res.status(201).json(newFavorite);
  } catch (error) {
    console.error('Add page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ページお気に入り削除
export const removePageFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { url } = req.body;
    const user = req.user!;

    if (!url) {
      res.status(400).json({ message: 'URLは必須です' });
      return;
    }

    const existing = getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = ? AND url = ?',
      [user.id, url]
    );

    if (!existing) {
      res.status(404).json({ message: 'お気に入りが見つかりません' });
      return;
    }

    runQuery(
      'DELETE FROM page_favorites WHERE user_id = ? AND url = ?',
      [user.id, url]
    );

    res.json({ message: 'お気に入りから削除しました' });
  } catch (error) {
    console.error('Remove page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ページお気に入り切り替え
export const togglePageFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { url, title, icon } = req.body;
    const user = req.user!;

    if (!url || !title) {
      res.status(400).json({ message: 'URLとタイトルは必須です' });
      return;
    }

    const existing = getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = ? AND url = ?',
      [user.id, url]
    );

    if (existing) {
      // 削除
      runQuery(
        'DELETE FROM page_favorites WHERE user_id = ? AND url = ?',
        [user.id, url]
      );
      res.json({ is_favorite: false, message: 'お気に入りから削除しました' });
    } else {
      // 追加
      runQuery(
        'INSERT INTO page_favorites (user_id, url, title, icon) VALUES (?, ?, ?, ?)',
        [user.id, url, title, icon || null]
      );
      res.json({ is_favorite: true, message: 'お気に入りに追加しました' });
    }
  } catch (error) {
    console.error('Toggle page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ユーザーのページお気に入り一覧取得
export const getPageFavorites = (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;

    const favorites = getAll<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    res.json(favorites);
  } catch (error) {
    console.error('Get page favorites error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ページお気に入り状態チェック
export const checkPageFavorite = (req: AuthRequest, res: Response): void => {
  try {
    const { url } = req.query;
    const user = req.user!;

    if (!url) {
      res.status(400).json({ message: 'URLは必須です' });
      return;
    }

    const existing = getOne<PageFavorite>(
      'SELECT * FROM page_favorites WHERE user_id = ? AND url = ?',
      [user.id, url as string]
    );

    res.json({ is_favorite: !!existing });
  } catch (error) {
    console.error('Check page favorite error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
