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
import { auditLog } from '../middlewares/auditLog';

const router = Router();

router.use(authenticateToken);

// 承認者一覧（全認証ユーザーがアクセス可能）
router.get('/approvers', getApprovers);

// 以下は管理者のみ
router.get('/', requireRole('admin'), getUsers);
router.post('/bulk-delete', requireRole('admin'), auditLog('bulk_delete', 'user'), bulkDeleteUsers);
router.get('/:id', requireRole('admin'), getUser);
router.post('/', requireRole('admin'), auditLog('create', 'user'), createUser);
router.put('/:id', requireRole('admin'), auditLog('update', 'user'), updateUser);
router.delete('/:id', requireRole('admin'), auditLog('delete', 'user'), deleteUser);
router.put('/:id/password', requireRole('admin'), auditLog('reset_password', 'user'), changePassword);

export default router;
