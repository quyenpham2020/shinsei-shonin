import { Router } from 'express';
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  approveApplication,
  rejectApplication,
  withdrawApplication,
  addComment,
  createSupplementaryApplication,
} from '../controllers/applicationController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

// 申請一覧・詳細
router.get('/', getApplications);
router.get('/:id', getApplication);

// 申請作成・更新・削除
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

// 承認・却下（承認者・管理者のみ）
router.post('/:id/approve', requireRole('approver', 'admin'), approveApplication);
router.post('/:id/reject', requireRole('approver', 'admin'), rejectApplication);

// コメント追加
router.post('/:id/comments', addComment);

// 補足申請作成
router.post('/:parentId/supplementary', createSupplementaryApplication);

export default router;
