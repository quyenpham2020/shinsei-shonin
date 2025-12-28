import express from 'express';
import { getAllUsersWithAccess, bulkUpdateAccess } from '../controllers/systemAccessController';
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/system-access/users - Get all users with their system access
router.get('/users', getAllUsersWithAccess);

// POST /api/system-access/bulk-update - Bulk update system access
router.post('/bulk-update', bulkUpdateAccess);

export default router;
