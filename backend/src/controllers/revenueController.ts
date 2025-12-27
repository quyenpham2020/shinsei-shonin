import { Response } from 'express';
import { runQuery, getAll, getOne } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface RevenueRecord {
  id: number;
  customer_id: number;
  customer_name: string;
  year: number;
  month: number;
  mm_onsite: number;
  mm_offshore: number;
  unit_price: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

// Helper function to check if user can access customer data
const canAccessCustomer = (user: any, customerId: number): boolean => {
  if (user.role === 'admin' || user.role === 'bod' || user.role === 'gm') {
    return true;
  }

  if (user.role === 'onsite_leader' && user.teamId) {
    // Check if user's team is assigned to this customer
    const assignment = getOne<{ customer_id: number }>(
      'SELECT customer_id FROM customer_teams WHERE customer_id = ? AND team_id = ?',
      [customerId, user.teamId]
    );
    return !!assignment;
  }

  return false;
};

// Get all revenue records (with access control)
export const getRevenueRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Members cannot access revenue data
  if (user.role === 'user' || user.role === 'approver') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    let query = `
      SELECT rr.*, c.name as customer_name
      FROM revenue_records rr
      INNER JOIN customers c ON rr.customer_id = c.id
    `;
    const params: any[] = [];

    // Onsite leaders see only data for their assigned customers
    if (user.role === 'onsite_leader' && user.teamId) {
      query += `
        INNER JOIN customer_teams ct ON c.id = ct.customer_id
        WHERE ct.team_id = ?
      `;
      params.push(user.teamId);
    }

    query += ' ORDER BY rr.year DESC, rr.month DESC, c.name';

    const records = getAll<RevenueRecord>(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get revenue records error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Get revenue records for a specific customer
export const getCustomerRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const customerId = parseInt(req.params.customerId);

  // Members cannot access revenue data
  if (user.role === 'user' || user.role === 'approver') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  // Check access rights
  if (!canAccessCustomer(user, customerId)) {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    const records = getAll<RevenueRecord>(
      `SELECT rr.*, c.name as customer_name
       FROM revenue_records rr
       INNER JOIN customers c ON rr.customer_id = c.id
       WHERE rr.customer_id = ?
       ORDER BY rr.year DESC, rr.month DESC`,
      [customerId]
    );

    res.json(records);
  } catch (error) {
    console.error('Get customer revenue error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Get single revenue record
export const getRevenueRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const recordId = parseInt(req.params.id);

  // Members cannot access revenue data
  if (user.role === 'user' || user.role === 'approver') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    const record = getOne<RevenueRecord>(
      `SELECT rr.*, c.name as customer_name
       FROM revenue_records rr
       INNER JOIN customers c ON rr.customer_id = c.id
       WHERE rr.id = ?`,
      [recordId]
    );

    if (!record) {
      res.status(404).json({ message: req.__('errors.notFound') });
      return;
    }

    // Check access rights
    if (!canAccessCustomer(user, record.customer_id)) {
      res.status(403).json({ message: req.__('errors.forbidden') });
      return;
    }

    res.json(record);
  } catch (error) {
    console.error('Get revenue record error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Create revenue record
export const createRevenueRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { customer_id, year, month, mm_onsite, mm_offshore, unit_price, notes } = req.body;

  // Only admin, GM, BOD, and onsite_leader can create revenue records
  if (user.role === 'user' || user.role === 'approver') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  // Check access rights
  if (!canAccessCustomer(user, customer_id)) {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    // Calculate total amount
    const total_mm = (mm_onsite || 0) + (mm_offshore || 0);
    const total_amount = total_mm * (unit_price || 0);

    const result = runQuery(
      `INSERT INTO revenue_records
       (customer_id, year, month, mm_onsite, mm_offshore, unit_price, total_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, year, month, mm_onsite || 0, mm_offshore || 0, unit_price || 0, total_amount, notes || null, user.id]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: req.__('success.created', { resource: req.__('resources.revenue') || 'Revenue record' })
    });
  } catch (error: any) {
    console.error('Create revenue record error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ message: 'Revenue record for this customer and month already exists' });
    } else {
      res.status(500).json({ message: req.__('errors.serverError') });
    }
  }
};

// Update revenue record
export const updateRevenueRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const recordId = parseInt(req.params.id);
  const { customer_id, year, month, mm_onsite, mm_offshore, unit_price, notes } = req.body;

  // Only admin, GM, BOD, and onsite_leader can update revenue records
  if (user.role === 'user' || user.role === 'approver') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    // Get existing record to check access
    const existing = getOne<RevenueRecord>(
      'SELECT * FROM revenue_records WHERE id = ?',
      [recordId]
    );

    if (!existing) {
      res.status(404).json({ message: req.__('errors.notFound') });
      return;
    }

    // Check access rights
    if (!canAccessCustomer(user, existing.customer_id)) {
      res.status(403).json({ message: req.__('errors.forbidden') });
      return;
    }

    // Calculate total amount
    const total_mm = (mm_onsite || 0) + (mm_offshore || 0);
    const total_amount = total_mm * (unit_price || 0);

    runQuery(
      `UPDATE revenue_records
       SET customer_id = ?, year = ?, month = ?, mm_onsite = ?, mm_offshore = ?,
           unit_price = ?, total_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [customer_id, year, month, mm_onsite || 0, mm_offshore || 0, unit_price || 0, total_amount, notes || null, recordId]
    );

    res.json({
      message: req.__('success.updated', { resource: req.__('resources.revenue') || 'Revenue record' })
    });
  } catch (error) {
    console.error('Update revenue record error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Delete revenue record
export const deleteRevenueRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const recordId = parseInt(req.params.id);

  // Only admin, GM, BOD can delete revenue records
  if (user.role !== 'admin' && user.role !== 'gm' && user.role !== 'bod') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    const existing = getOne<RevenueRecord>(
      'SELECT * FROM revenue_records WHERE id = ?',
      [recordId]
    );

    if (!existing) {
      res.status(404).json({ message: req.__('errors.notFound') });
      return;
    }

    // Check access rights
    if (!canAccessCustomer(user, existing.customer_id)) {
      res.status(403).json({ message: req.__('errors.forbidden') });
      return;
    }

    runQuery('DELETE FROM revenue_records WHERE id = ?', [recordId]);
    res.json({
      message: req.__('success.deleted', { resource: req.__('resources.revenue') || 'Revenue record' })
    });
  } catch (error) {
    console.error('Delete revenue record error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Get revenue statistics and comparisons
export const getRevenueStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { customer_id, start_year, start_month, end_year, end_month } = req.query;

  // Members cannot access revenue data
  if (user.role === 'user' || user.role === 'approver') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    let query = `
      SELECT rr.*, c.name as customer_name
      FROM revenue_records rr
      INNER JOIN customers c ON rr.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by customer if specified
    if (customer_id) {
      const custId = parseInt(customer_id as string);
      if (!canAccessCustomer(user, custId)) {
        res.status(403).json({ message: req.__('errors.forbidden') });
        return;
      }
      query += ' AND rr.customer_id = ?';
      params.push(custId);
    }

    // Onsite leaders see only their assigned customers
    if (user.role === 'onsite_leader' && user.teamId) {
      query += `
        AND EXISTS (
          SELECT 1 FROM customer_teams ct
          WHERE ct.customer_id = rr.customer_id AND ct.team_id = ?
        )
      `;
      params.push(user.teamId);
    }

    // Date range filter
    if (start_year && start_month) {
      query += ' AND (rr.year > ? OR (rr.year = ? AND rr.month >= ?))';
      params.push(start_year, start_year, start_month);
    }
    if (end_year && end_month) {
      query += ' AND (rr.year < ? OR (rr.year = ? AND rr.month <= ?))';
      params.push(end_year, end_year, end_month);
    }

    query += ' ORDER BY rr.year, rr.month';

    const records = getAll<RevenueRecord>(query, params);

    // Calculate statistics
    const stats = {
      total_revenue: records.reduce((sum, r) => sum + r.total_amount, 0),
      total_mm_onsite: records.reduce((sum, r) => sum + r.mm_onsite, 0),
      total_mm_offshore: records.reduce((sum, r) => sum + r.mm_offshore, 0),
      record_count: records.length,
      records: records
    };

    res.json(stats);
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};
