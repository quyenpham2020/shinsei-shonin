import { Router } from 'express';
import {
  addPageFavorite,
  removePageFavorite,
  togglePageFavorite,
  getPageFavorites,
  checkPageFavorite,
} from '../controllers/pageFavoriteController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

// ページお気に入り一覧取得
router.get('/', getPageFavorites);

// ページお気に入り状態チェック
router.get('/check', checkPageFavorite);

// ページお気に入り追加
router.post('/', addPageFavorite);

// ページお気に入り切り替え
router.post('/toggle', togglePageFavorite);

// ページお気に入り削除
router.delete('/', removePageFavorite);

export default router;
