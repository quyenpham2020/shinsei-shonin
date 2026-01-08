import express from 'express';
import { getAllUsersWithAccess, bulkUpdateAccess, getMyAccess } from '../controllers/systemAccessController';
import { authMiddleware } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLog';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/system-access/my-access - Get current user's system access
router.get('/my-access', getMyAccess);

// GET /api/system-access/users - Get all users with their system access
router.get('/users', getAllUsersWithAccess);

// POST /api/system-access/bulk-update - Bulk update system access
router.post('/bulk-update', auditLog('update_access', 'system_access'), bulkUpdateAccess);

export default router;
