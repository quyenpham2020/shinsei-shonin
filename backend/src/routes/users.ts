import { Router } from 'express';
import { getUsers, getApprovers } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole('admin'), getUsers);
router.get('/approvers', getApprovers);

export default router;
