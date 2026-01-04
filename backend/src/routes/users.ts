import { Router } from 'express';
import {
  getUsers,
  getUser,
  getApprovers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  bulkDeleteUsers,
} from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// 承認者一覧（全認証ユーザーがアクセス可能）
router.get('/approvers', getApprovers);

// 以下は管理者のみ
router.get('/', requireRole('admin'), getUsers);
router.post('/bulk-delete', requireRole('admin'), bulkDeleteUsers);
router.get('/:id', requireRole('admin'), getUser);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);
router.put('/:id/password', requireRole('admin'), changePassword);

export default router;
