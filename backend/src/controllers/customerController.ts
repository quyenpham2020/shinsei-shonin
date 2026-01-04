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
      const customers = await getAll<CustomerWithTeams>(`
        SELECT c.*,
          STRING_AGG(DISTINCT ct.team_id::text, ',') as team_ids,
          STRING_AGG(DISTINCT t.name, ',') as team_names
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

      const customers = await getAll<CustomerWithTeams>(`
        SELECT c.*,
          STRING_AGG(DISTINCT ct.team_id::text, ',') as team_ids,
          STRING_AGG(DISTINCT t.name, ',') as team_names
        FROM customers c
        INNER JOIN customer_teams ct ON c.id = ct.customer_id
        LEFT JOIN teams t ON ct.team_id = t.id
        WHERE ct.team_id = $1
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
    const customer = await getOne<CustomerWithTeams>(`
      SELECT c.*,
        STRING_AGG(DISTINCT ct.team_id::text, ',') as team_ids,
        STRING_AGG(DISTINCT t.name, ',') as team_names
      FROM customers c
      LEFT JOIN customer_teams ct ON c.id = ct.customer_id
      LEFT JOIN teams t ON ct.team_id = t.id
      WHERE c.id = $1
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
export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { name, code, contactPerson, email, phone, address, team_ids } = req.body;

  if (user.role !== 'admin') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    const result = await runQuery(
      'INSERT INTO customers (name, code, contact_person, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, code || null, contactPerson || null, email || null, phone || null, address || null]
    );

    const customerId = result.rows[0].id;

    // Add team associations
    if (team_ids && Array.isArray(team_ids) && team_ids.length > 0) {
      for (const teamId of team_ids) {
        await runQuery(
          'INSERT INTO customer_teams (customer_id, team_id) VALUES ($1, $2)',
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
export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const customerId = parseInt(req.params.id);
  const { name, description, is_active, team_ids } = req.body;

  if (user.role !== 'admin') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    await runQuery(
      `UPDATE customers
       SET name = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4`,
      [name, description || null, is_active, customerId]
    );

    // Update team associations
    await runQuery('DELETE FROM customer_teams WHERE customer_id = $1', [customerId]);

    if (team_ids && Array.isArray(team_ids) && team_ids.length > 0) {
      for (const teamId of team_ids) {
        await runQuery(
          'INSERT INTO customer_teams (customer_id, team_id) VALUES ($1, $2)',
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
export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const customerId = parseInt(req.params.id);

  if (user.role !== 'admin') {
    res.status(403).json({ message: req.__('errors.forbidden') });
    return;
  }

  try {
    await runQuery('DELETE FROM customers WHERE id = $1', [customerId]);
    res.json({
      message: req.__('success.deleted', { resource: req.__('resources.customer') || 'Customer' })
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: req.__('errors.serverError') });
  }
};
