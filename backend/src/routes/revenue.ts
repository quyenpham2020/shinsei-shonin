import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getRevenueRecords,
  getRevenueRecord,
  getCustomerRevenue,
  createRevenueRecord,
  updateRevenueRecord,
  deleteRevenueRecord,
  getRevenueStats,
} from '../controllers/revenueController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getRevenueRecords);
router.get('/stats', getRevenueStats);
router.get('/customer/:customerId', getCustomerRevenue);
router.get('/:id', getRevenueRecord);
router.post('/', createRevenueRecord);
router.put('/:id', updateRevenueRecord);
router.delete('/:id', deleteRevenueRecord);

export default router;
