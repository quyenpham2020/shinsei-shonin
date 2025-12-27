import { Router } from 'express';
import {
  getAllFeedback,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} from '../controllers/feedbackController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all feedback (admin sees all, users see their own)
router.get('/', getAllFeedback);

// Get single feedback by ID
router.get('/:id', getFeedback);

// Create new feedback
router.post('/', createFeedback);

// Update feedback (admin only - for responding)
router.put('/:id', updateFeedback);

// Delete feedback (admin only)
router.delete('/:id', deleteFeedback);

export default router;
