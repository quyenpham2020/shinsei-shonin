import { Router } from 'express';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLog';

const router = Router();

router.use(authenticateToken);

// 部署一覧は全認証ユーザーがアクセス可能（ユーザー登録時に使用）
router.get('/', getDepartments);

// 以下は管理者のみ
router.get('/:id', requireRole('admin'), getDepartment);
router.post('/', requireRole('admin'), auditLog('create', 'department'), createDepartment);
router.put('/:id', requireRole('admin'), auditLog('update', 'department'), updateDepartment);
router.delete('/:id', requireRole('admin'), auditLog('delete', 'department'), deleteDepartment);

export default router;
