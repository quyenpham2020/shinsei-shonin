import { Router } from 'express';
import {
  getAllTeams,
  getTeamById,
  getTeamMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  bulkDeleteTeams,
  addTeamMember,
  removeTeamMember,
  getAvailableMembers,
  getDepartmentGM
} from '../controllers/teamController';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Team CRUD operations
router.get('/', getAllTeams);
router.get('/:id', getTeamById);
router.post('/', auditLog('create', 'team'), createTeam);
router.post('/bulk-delete', auditLog('bulk_delete', 'team'), bulkDeleteTeams);
router.put('/:id', auditLog('update', 'team'), updateTeam);
router.delete('/:id', auditLog('delete', 'team'), deleteTeam);

// Team member management
router.get('/:id/members', getTeamMembers);
router.get('/:id/available-members', getAvailableMembers);
router.post('/:id/members', auditLog('add_member', 'team'), addTeamMember);
router.delete('/:id/members/:userId', auditLog('remove_member', 'team'), removeTeamMember);

// Get department GM for default leader
router.get('/department/:departmentId/gm', getDepartmentGM);

export default router;
