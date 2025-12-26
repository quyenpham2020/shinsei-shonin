import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getAllUsersWithAccess,
  getUserAccess,
  getMyAccess,
  updateUserAccess,
  bulkUpdateAccess,
} from '../controllers/systemAccessController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user's system access
router.get('/my-access', getMyAccess);

// Admin only routes
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Get all users with their system access (admin only)
router.get('/users', adminOnly, getAllUsersWithAccess);

// Get system access for a specific user (admin only)
router.get('/users/:userId', adminOnly, getUserAccess);

// Update system access for a user (admin only)
router.put('/users/:userId', adminOnly, updateUserAccess);

// Bulk update access (admin only)
router.post('/bulk-update', adminOnly, bulkUpdateAccess);

export default router;
