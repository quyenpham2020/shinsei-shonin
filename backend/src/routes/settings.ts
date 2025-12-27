import { Router } from 'express';
import {
  getAllSettings,
  getSetting,
  getPublicSetting,
  updateSetting,
  createSetting,
  deleteSetting,
} from '../controllers/settingsController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Public route (no auth required) - for checking if features are enabled
router.get('/public/:key', getPublicSetting);

// All other routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('admin'));

// Get all settings
router.get('/', getAllSettings);

// Get single setting by key
router.get('/:key', getSetting);

// Update setting
router.put('/:key', updateSetting);

// Create new setting
router.post('/', createSetting);

// Delete setting
router.delete('/:key', deleteSetting);

export default router;
