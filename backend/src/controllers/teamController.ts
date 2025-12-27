import { Request, Response } from 'express';
import { getAll, getOne, runQuery, saveDatabase } from '../config/database';
import { canManageTeams, getManageableTeams, canAssignOnsiteLeader, UserPermissionInfo } from '../services/permissionService';

interface TeamWithDetails {
  id: number;
  name: string;
  department_id: number;
  department_name: string;
  leader_id: number | null;
  leader_name: string | null;
  description: string | null;
  is_active: number;
  member_count: number;
  created_at: string;
}

interface TeamMember {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

// Get all teams (filtered by user's authority)
export const getAllTeams = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get actor's permission info
    const actor = getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = ?
    `, [user.id]);

    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }

    let teams: TeamWithDetails[];

    // Admin and BOD see all teams
    if (actor.role === 'admin' || actor.role === 'bod') {
      teams = getAll<TeamWithDetails>(`
        SELECT t.*, d.name as department_name, u.name as leader_name,
               (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users u ON t.leader_id = u.id
        ORDER BY d.name, t.name
      `);
    } else if (actor.role === 'gm') {
      // GM sees teams in their department
      if (actor.department_id) {
        teams = getAll<TeamWithDetails>(`
          SELECT t.*, d.name as department_name, u.name as leader_name,
                 (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
          FROM teams t
          LEFT JOIN departments d ON t.department_id = d.id
          LEFT JOIN users u ON t.leader_id = u.id
          WHERE t.department_id = ?
          ORDER BY t.name
        `, [actor.department_id]);
      } else {
        teams = getAll<TeamWithDetails>(`
          SELECT t.*, d.name as department_name, u.name as leader_name,
                 (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
          FROM teams t
          LEFT JOIN departments d ON t.department_id = d.id
          LEFT JOIN users u ON t.leader_id = u.id
          WHERE d.name = ?
          ORDER BY t.name
        `, [actor.department]);
      }
    } else if (actor.role === 'onsite_leader' && actor.team_id) {
      // Onsite leader sees only their team
      teams = getAll<TeamWithDetails>(`
        SELECT t.*, d.name as department_name, u.name as leader_name,
               (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users u ON t.leader_id = u.id
        WHERE t.id = ?
      `, [actor.team_id]);
    } else {
      // Regular users don't see teams management
      teams = [];
    }

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

// Get team by ID
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const team = getOne<TeamWithDetails>(`
      SELECT t.*, d.name as department_name, u.name as leader_name,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = ?
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

// Get team members
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const members = getAll<TeamMember>(`
      SELECT id, employee_id, name, email, role, department
      FROM users
      WHERE team_id = ?
      ORDER BY role, name
    `, [parseInt(id)]);

    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

// Create new team
export const createTeam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, department_id, description, leader_id } = req.body;

    // Get actor's permission info
    const actor = getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = ?
    `, [user.id]);

    if (!actor || !canManageTeams(actor)) {
      return res.status(403).json({ error: 'Insufficient permissions to create teams' });
    }

    // Verify department exists
    const dept = getOne<{ id: number }>(`SELECT id FROM departments WHERE id = ?`, [department_id]);
    if (!dept) {
      return res.status(400).json({ error: 'Department not found' });
    }

    // GM can only create teams in their own department
    if (actor.role === 'gm' && actor.department_id !== department_id) {
      return res.status(403).json({ error: 'Cannot create teams in other departments' });
    }

    const result = runQuery(`
      INSERT INTO teams (name, department_id, description, leader_id)
      VALUES (?, ?, ?, ?)
    `, [name, department_id, description || null, leader_id || null]);

    // If leader is specified, update their role to onsite_leader and assign to team
    if (leader_id) {
      runQuery(`
        UPDATE users SET role = 'onsite_leader', team_id = ?
        WHERE id = ?
      `, [result.lastInsertRowid, leader_id]);
    }

    saveDatabase();

    const newTeam = getOne<TeamWithDetails>(`
      SELECT t.*, d.name as department_name, u.name as leader_name,
             0 as member_count
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

// Update team
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { name, description, leader_id, is_active } = req.body;

    // Get actor's permission info
    const actor = getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = ?
    `, [user.id]);

    if (!actor || !canManageTeams(actor)) {
      return res.status(403).json({ error: 'Insufficient permissions to update teams' });
    }

    // Get current team
    const team = getOne<{ id: number; department_id: number; leader_id: number | null }>(`
      SELECT id, department_id, leader_id FROM teams WHERE id = ?
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // GM can only update teams in their own department
    if (actor.role === 'gm' && actor.department_id !== team.department_id) {
      return res.status(403).json({ error: 'Cannot update teams in other departments' });
    }

    // Handle leader change
    if (leader_id !== undefined && leader_id !== team.leader_id) {
      // Remove old leader's onsite_leader role
      if (team.leader_id) {
        runQuery(`UPDATE users SET role = 'user' WHERE id = ? AND role = 'onsite_leader'`, [team.leader_id]);
      }
      // Set new leader
      if (leader_id) {
        runQuery(`UPDATE users SET role = 'onsite_leader', team_id = ? WHERE id = ?`, [parseInt(id), leader_id]);
      }
    }

    runQuery(`
      UPDATE teams SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        leader_id = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [name, description, leader_id || null, is_active, parseInt(id)]);

    saveDatabase();

    const updatedTeam = getOne<TeamWithDetails>(`
      SELECT t.*, d.name as department_name, u.name as leader_name,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = ?
    `, [parseInt(id)]);

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

// Delete team
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Get actor's permission info
    const actor = getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = ?
    `, [user.id]);

    if (!actor || !canManageTeams(actor)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete teams' });
    }

    // Get team
    const team = getOne<{ id: number; department_id: number; leader_id: number | null }>(`
      SELECT id, department_id, leader_id FROM teams WHERE id = ?
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // GM can only delete teams in their own department
    if (actor.role === 'gm' && actor.department_id !== team.department_id) {
      return res.status(403).json({ error: 'Cannot delete teams in other departments' });
    }

    // Remove team_id from all members
    runQuery(`UPDATE users SET team_id = NULL WHERE team_id = ?`, [parseInt(id)]);

    // Remove onsite_leader role from the leader
    if (team.leader_id) {
      runQuery(`UPDATE users SET role = 'user' WHERE id = ? AND role = 'onsite_leader'`, [team.leader_id]);
    }

    // Soft delete (mark as inactive) instead of hard delete
    runQuery(`UPDATE teams SET is_active = 0 WHERE id = ?`, [parseInt(id)]);

    saveDatabase();

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

// Add member to team
export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const user = (req as any).user;

    // Get actor's permission info
    const actor = getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = ?
    `, [user.id]);

    // Get team
    const team = getOne<{ id: number; department_id: number; leader_id: number | null }>(`
      SELECT id, department_id, leader_id FROM teams WHERE id = ?
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const canModify = actor?.role === 'admin' ||
      actor?.role === 'bod' ||
      (actor?.role === 'gm' && actor.department_id === team.department_id) ||
      (actor?.role === 'onsite_leader' && actor.team_id === parseInt(id));

    if (!canModify) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    runQuery(`UPDATE users SET team_id = ? WHERE id = ?`, [parseInt(id), user_id]);
    saveDatabase();

    res.json({ message: 'Member added to team successfully' });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
};

// Remove member from team
export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const user = (req as any).user;

    // Get actor's permission info
    const actor = getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = ?
    `, [user.id]);

    // Get team
    const team = getOne<{ id: number; department_id: number; leader_id: number | null }>(`
      SELECT id, department_id, leader_id FROM teams WHERE id = ?
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const canModify = actor?.role === 'admin' ||
      actor?.role === 'bod' ||
      (actor?.role === 'gm' && actor.department_id === team.department_id) ||
      (actor?.role === 'onsite_leader' && actor.team_id === parseInt(id));

    if (!canModify) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Cannot remove the team leader
    if (team.leader_id === parseInt(userId)) {
      return res.status(400).json({ error: 'Cannot remove team leader. Change leader first.' });
    }

    runQuery(`UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?`, [parseInt(userId), parseInt(id)]);
    saveDatabase();

    res.json({ message: 'Member removed from team successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
};

// Get users available to add to a team (same department, not in any team)
export const getAvailableMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const team = getOne<{ department_id: number }>(`
      SELECT department_id FROM teams WHERE id = ?
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const availableUsers = getAll<TeamMember>(`
      SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department
      FROM users u
      LEFT JOIN departments d ON u.department = d.name
      WHERE (d.id = ? OR u.department_id = ?)
      AND (u.team_id IS NULL OR u.team_id != ?)
      AND u.role NOT IN ('admin', 'bod', 'gm')
      ORDER BY u.name
    `, [team.department_id, team.department_id, parseInt(id)]);

    res.json(availableUsers);
  } catch (error) {
    console.error('Error fetching available members:', error);
    res.status(500).json({ error: 'Failed to fetch available members' });
  }
};
