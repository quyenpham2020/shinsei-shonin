import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getLoginLogs,
  getAuditLogs,
  getPasswordChangeLogs,
  getAllAuditLogs,
} from '../controllers/auditLogController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get login logs
router.get('/login-logs', getLoginLogs);

// Get audit logs (user actions)
router.get('/audit-logs', getAuditLogs);

// Get password change logs
router.get('/password-logs', getPasswordChangeLogs);

// Get all audit logs combined
router.get('/all', getAllAuditLogs);

export default router;
