import { Response } from 'express';
import { runQuery, getAll, getOne } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { getUsersUnderAuthority } from '../services/permissionService';

interface Customer {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface CustomerWithTeams extends Customer {
  team_ids: number[];
  team_names: string[];
}

// Get all customers (with access control)
export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  try {
    // Admin, BOD, GM see all customers
    if (user.role === 'admin' || user.role === 'bod' || user.role === 'gm') {
      const customers = getAll<CustomerWithTeams>(`
        SELECT c.*,
          GROUP_CONCAT(DISTINCT ct.team_id) as team_ids,
          GROUP_CONCAT(DISTINCT t.name) as team_names
        FROM customers c
        LEFT JOIN customer_teams ct ON c.id = ct.customer_id
        LEFT JOIN teams t ON ct.team_id = t.id
        GROUP BY c.id
        ORDER BY c.name
      `);

      const formattedCustomers = customers.map(c => ({
        ...c,
        team_ids: c.team_ids ? c.team_ids.toString().split(',').map(Number) : [],
        team_names: c.team_names ? c.team_names.toString().split(',') : []
      }));

      res.json(formattedCustomers);
      return;
    }

    // Onsite leader sees only customers assigned to their team
    if (user.role === 'onsite_leader') {
      if (!user.teamId) {
        res.json([]);
        return;
      }

      const customers = getAll<CustomerWithTeams>(`
        SELECT c.*,
          GROUP_CONCAT(DISTINCT ct.team_id) as team_ids,
          GROUP_CONCAT(DISTINCT t.name) as team_names
        FROM customers c
        INNER JOIN customer_teams ct ON c.id = ct.customer_id
        LEFT JOIN teams t ON ct.team_id = t.id
        WHERE ct.team_id = ?
        GROUP BY c.id
        ORDER BY c.name
      `, [user.teamId]);

      const formattedCustomers = customers.map(c => ({
        ...c,
        team_ids: c.team_ids ? c.team_ids.toString().split(',').map(Number) : [],
        team_names: c.team_names ? c.team_names.toString().split(',') : []
      }));

      res.json(formattedCustomers);
      return;
    }

    // Members and approvers cannot view customers
    res.status(403).json({ message: req.__('errors.forbidden') });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Get single customer
export const getCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const customerId = parseInt(req.params.id);

  try {
    const customer = getOne<CustomerWithTeams>(`
      SELECT c.*,
        GROUP_CONCAT(DISTINCT ct.team_id) as team_ids,
        GROUP_CONCAT(DISTINCT t.name) as team_names
      FROM customers c
      LEFT JOIN customer_teams ct ON c.id = ct.customer_id
      LEFT JOIN teams t ON ct.team_id = t.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [customerId]);

    if (!customer) {
      res.status(404).json({ message: req.__('errors.notFound') });
      return;
    }

    // Check access rights
    if (user.role !== 'admin' && user.role !== 'bod' && user.role !== 'gm') {
      if (user.role === 'onsite_leader') {
        const teamIds = customer.team_ids ? customer.team_ids.toString().split(',').map(Number) : [];
        if (!user.teamId || !teamIds.includes(user.teamId)) {
          res.status(403).json({ message: req.__('errors.forbidden') });
          return;
        }
      } else {
        res.status(403).json({ message: req.__('errors.forbidden') });
        return;
      }
    }

    const formattedCustomer = {
      ...customer,
      team_ids: customer.team_ids ? customer.team_ids.toString().split(',').map(Number) : [],
      team_names: customer.team_names ? customer.team_names.toString().split(',') : []
    };

    res.json(formattedCustomer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Create customer (admin only)
export const createCustomer = (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const { name, description, team_ids } = req.body;

  if (user.role !== 'admin') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    const result = runQuery(
      'INSERT INTO customers (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    const customerId = result.lastInsertRowid;

    // Add team associations
    if (team_ids && Array.isArray(team_ids) && team_ids.length > 0) {
      for (const teamId of team_ids) {
        runQuery(
          'INSERT INTO customer_teams (customer_id, team_id) VALUES (?, ?)',
          [customerId, teamId]
        );
      }
    }

    res.status(201).json({
      id: customerId,
      message: req.__('success.created', { resource: req.__('resources.customer') || 'Customer' })
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Update customer (admin only)
export const updateCustomer = (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const customerId = parseInt(req.params.id);
  const { name, description, is_active, team_ids } = req.body;

  if (user.role !== 'admin') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    runQuery(
      `UPDATE customers
       SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description || null, is_active, customerId]
    );

    // Update team associations
    runQuery('DELETE FROM customer_teams WHERE customer_id = ?', [customerId]);

    if (team_ids && Array.isArray(team_ids) && team_ids.length > 0) {
      for (const teamId of team_ids) {
        runQuery(
          'INSERT INTO customer_teams (customer_id, team_id) VALUES (?, ?)',
          [customerId, teamId]
        );
      }
    }

    res.json({
      message: req.__('success.updated', { resource: req.__('resources.customer') || 'Customer' })
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};

// Delete customer (admin only)
export const deleteCustomer = (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const customerId = parseInt(req.params.id);

  if (user.role !== 'admin') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    runQuery('DELETE FROM customers WHERE id = ?', [customerId]);
    res.json({
      message: req.__('success.deleted', { resource: req.__('resources.customer') || 'Customer' })
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};
