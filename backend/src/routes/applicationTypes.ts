import { Router } from 'express';
import {
  getApplicationTypes,
  getApplicationType,
  createApplicationType,
  updateApplicationType,
  deleteApplicationType,
} from '../controllers/applicationTypeController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// 申請種別一覧は全認証ユーザーがアクセス可能（申請作成時に使用）
router.get('/', getApplicationTypes);

// 以下は管理者のみ
router.get('/:id', requireRole('admin'), getApplicationType);
router.post('/', requireRole('admin'), createApplicationType);
router.put('/:id', requireRole('admin'), updateApplicationType);
router.delete('/:id', requireRole('admin'), deleteApplicationType);

export default router;
