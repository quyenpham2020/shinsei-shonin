import { Request, Response } from 'express';
import { getAll, runQuery } from '../config/database';

interface UserWithAccess {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  team_name?: string;
  role: string;
  systems: string;
}

// Get all users with their system access
export const getAllUsersWithAccess = async (req: Request, res: Response) => {
  try {
    const usersWithAccess = await getAll<UserWithAccess>(`
      SELECT
        u.id,
        u.employee_id,
        u.name,
        u.email,
        u.department,
        t.name as team_name,
        u.role,
        STRING_AGG(usa.system_id, ',') as systems
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN user_system_access usa ON u.id = usa.user_id
      GROUP BY u.id, u.employee_id, u.name, u.email, u.department, t.name, u.role
      ORDER BY u.department, u.name
    `);

    // Transform systems from comma-separated string to array
    const result = usersWithAccess.map(user => ({
      ...user,
      systems: user.systems ? user.systems.split(',') : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching users with access:', error);
    res.status(500).json({ error: 'Failed to fetch users with access' });
  }
};

// Bulk update system access for multiple users
export const bulkUpdateAccess = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    // Process each user's system access update
    for (const update of updates) {
      const { userId, systems } = update;

      // Delete existing access for this user
      await runQuery(`DELETE FROM user_system_access WHERE user_id = $1`, [userId]);

      // Insert new access rights
      for (const systemId of systems) {
        await runQuery(`
          INSERT INTO user_system_access (user_id, system_id)
          VALUES ($1, $2)
        `, [userId, systemId]);
      }
    }

    res.json({ message: 'System access updated successfully' });
  } catch (error) {
    console.error('Error updating system access:', error);
    res.status(500).json({ error: 'Failed to update system access' });
  }
};

// Get current user's system access
export const getMyAccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userAccess = await getAll<{ system_id: string }>(`
      SELECT system_id
      FROM user_system_access
      WHERE user_id = $1
    `, [userId]);

    const systems = userAccess.map(access => access.system_id);

    res.json({ systems });
  } catch (error) {
    console.error('Error fetching user access:', error);
    res.status(500).json({ error: 'Failed to fetch user access' });
  }
};
