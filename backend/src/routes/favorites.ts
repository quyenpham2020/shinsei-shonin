import { Router } from 'express';
import {
  toggleFavorite,
  getUserFavorites,
  checkFavorite,
  removeFavorite,
} from '../controllers/favoriteController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

// お気に入り一覧取得
router.get('/', getUserFavorites);

// お気に入り切り替え（追加/削除）
router.post('/:applicationId/toggle', toggleFavorite);

// お気に入り状態チェック
router.get('/:applicationId/check', checkFavorite);

// お気に入り削除
router.delete('/:applicationId', removeFavorite);

export default router;
