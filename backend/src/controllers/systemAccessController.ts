import { Request, Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';

interface UserSystemAccess {
  id: number;
  user_id: number;
  system_id: string;
  created_at: string;
}

interface UserWithAccess {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  systems: string[];
}

// Get all users with their system access
export const getAllUsersWithAccess = async (req: Request, res: Response) => {
  try {
    const users = getAll<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
      role: string;
    }>(`
      SELECT id, employee_id, name, email, department, role
      FROM users
      ORDER BY name
    `);

    const usersWithAccess: UserWithAccess[] = users.map(user => {
      const access = getAll<UserSystemAccess>(`
        SELECT * FROM user_system_access WHERE user_id = ?
      `, [user.id]);

      return {
        ...user,
        systems: access.map(a => a.system_id)
      };
    });

    res.json(usersWithAccess);
  } catch (error) {
    console.error('Error fetching users with access:', error);
    res.status(500).json({ message: 'Failed to fetch users with system access' });
  }
};

// Get system access for a specific user
export const getUserAccess = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const access = getAll<UserSystemAccess>(`
      SELECT * FROM user_system_access WHERE user_id = ?
    `, [userId]);

    res.json(access.map(a => a.system_id));
  } catch (error) {
    console.error('Error fetching user access:', error);
    res.status(500).json({ message: 'Failed to fetch user system access' });
  }
};

// Get current user's system access
export const getMyAccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Admin has access to all systems
    if ((req as any).user.role === 'admin') {
      res.json(['shinsei-shonin', 'weekly-report', 'master-management']);
      return;
    }

    const access = getAll<UserSystemAccess>(`
      SELECT * FROM user_system_access WHERE user_id = ?
    `, [userId]);

    res.json(access.map(a => a.system_id));
  } catch (error) {
    console.error('Error fetching my access:', error);
    res.status(500).json({ message: 'Failed to fetch system access' });
  }
};

// Update system access for a user
export const updateUserAccess = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { systems } = req.body;

    if (!Array.isArray(systems)) {
      res.status(400).json({ message: 'Systems must be an array' });
      return;
    }

    // Delete all existing access for this user
    runQuery('DELETE FROM user_system_access WHERE user_id = ?', [userId]);

    // Insert new access
    for (const systemId of systems) {
      runQuery(`
        INSERT INTO user_system_access (user_id, system_id)
        VALUES (?, ?)
      `, [userId, systemId]);
    }

    res.json({ message: 'System access updated successfully', systems });
  } catch (error) {
    console.error('Error updating user access:', error);
    res.status(500).json({ message: 'Failed to update user system access' });
  }
};

// Bulk update system access for multiple users
export const bulkUpdateAccess = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      res.status(400).json({ message: 'Updates must be an array' });
      return;
    }

    for (const update of updates) {
      const { userId, systems } = update;

      // Delete all existing access for this user
      runQuery('DELETE FROM user_system_access WHERE user_id = ?', [userId]);

      // Insert new access
      for (const systemId of systems) {
        runQuery(`
          INSERT INTO user_system_access (user_id, system_id)
          VALUES (?, ?)
        `, [userId, systemId]);
      }
    }

    res.json({ message: 'Bulk system access updated successfully' });
  } catch (error) {
    console.error('Error bulk updating access:', error);
    res.status(500).json({ message: 'Failed to bulk update system access' });
  }
};
