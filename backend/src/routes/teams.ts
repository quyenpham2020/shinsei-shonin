import { Router } from 'express';
import {
  getAllTeams,
  getTeamById,
  getTeamMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getAvailableMembers
} from '../controllers/teamController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Team CRUD operations
router.get('/', getAllTeams);
router.get('/:id', getTeamById);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

// Team member management
router.get('/:id/members', getTeamMembers);
router.get('/:id/available-members', getAvailableMembers);
router.post('/:id/members', addTeamMember);
router.delete('/:id/members/:userId', removeTeamMember);

export default router;
