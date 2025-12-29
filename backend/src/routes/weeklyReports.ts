import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getMyReports,
  getDepartmentReports,
  getReportsForComparison,
  createOrUpdateReport,
  getReport,
  deleteReport,
  getPendingReportUsers,
  getAllMembersWithReports,
  getMembersReportsLast3Weeks,
  getMemberReports,
  generateOverview,
  exportToExcel,
} from '../controllers/weeklyReportController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get my reports
router.get('/my', getMyReports);

// Get reports for comparison (current week vs previous week)
router.get('/comparison', getReportsForComparison);

// Get department reports (approvers/admins only)
router.get('/department', getDepartmentReports);

// Get users who haven't submitted report this week
router.get('/pending-users', getPendingReportUsers);

// Get all members with their reports for current week
router.get('/all-members', getAllMembersWithReports);

// Get members with reports for the last 3 weeks (leader view)
router.get('/members-3weeks', getMembersReportsLast3Weeks);

// Get all reports for a specific member
router.get('/member/:userId', getMemberReports);

// Generate overview from detailed report using Claude AI
router.post('/generate-overview', generateOverview);

// Export weekly reports to Excel with filters
router.get('/export', exportToExcel);

// Create or update report
router.post('/', createOrUpdateReport);

// Get single report by ID
router.get('/:id', getReport);

// Delete report
router.delete('/:id', deleteReport);

export default router;
