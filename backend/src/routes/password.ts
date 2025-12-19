import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  requestPasswordReset,
  resetPassword,
  changePassword,
  forceChangePassword,
  verifyResetToken,
} from '../controllers/passwordController';

const router = Router();

// Public routes (no authentication required)
router.post('/reset-request', requestPasswordReset);
router.post('/reset', resetPassword);
router.get('/verify-token/:token', verifyResetToken);

// Protected routes (authentication required)
router.post('/change', authenticateToken, changePassword);
router.post('/force-change', authenticateToken, forceChangePassword);

export default router;
