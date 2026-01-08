import { Router } from 'express';
import {
  getAllFeedback,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} from '../controllers/feedbackController';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all feedback (admin sees all, users see their own)
router.get('/', getAllFeedback);

// Get single feedback by ID
router.get('/:id', getFeedback);

// Create new feedback
router.post('/', auditLog('create', 'feedback'), createFeedback);

// Update feedback (admin only - for responding)
router.put('/:id', auditLog('respond', 'feedback'), updateFeedback);

// Delete feedback (admin only)
router.delete('/:id', auditLog('delete', 'feedback'), deleteFeedback);

export default router;
