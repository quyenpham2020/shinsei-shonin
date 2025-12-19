import { Router } from 'express';
import {
  getApprovers,
  getApprover,
  createApprover,
  updateApprover,
  deleteApprover,
  getApproverCandidates,
  getApproverDepartments,
} from '../controllers/approverController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// 自分の担当部署取得（承認者/管理者）
router.get('/my-departments', getApproverDepartments);

// 承認可能ユーザー一覧（管理者のみ）
router.get('/candidates', requireRole('admin'), getApproverCandidates);

// 承認者設定CRUD（管理者のみ）
router.get('/', requireRole('admin'), getApprovers);
router.get('/:id', requireRole('admin'), getApprover);
router.post('/', requireRole('admin'), createApprover);
router.put('/:id', requireRole('admin'), updateApprover);
router.delete('/:id', requireRole('admin'), deleteApprover);

export default router;
