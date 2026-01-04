import { Request, Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { canManageTeams, getManageableTeams, canAssignOnsiteLeader, UserPermissionInfo } from '../services/permissionService';

interface TeamWithDetails {
  id: number;
  name: string;
  leader_id: number | null;
  leader_name: string | null;
  description: string | null;
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
    const actor = await getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = $1
    `, [user.id]);

    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }

    let teams: TeamWithDetails[];

    // Admin and BOD see all teams
    if (actor.role === 'admin' || actor.role === 'bod') {
      teams = await getAll<TeamWithDetails>(`
        SELECT t.*, u.name as leader_name,
               (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
        FROM teams t
        LEFT JOIN users u ON t.leader_id = u.id
        ORDER BY t.name
      `);
    } else if (actor.role === 'gm') {
      // GM sees all teams (teams are not department-specific)
      teams = await getAll<TeamWithDetails>(`
        SELECT t.*, u.name as leader_name,
               (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
        FROM teams t
        LEFT JOIN users u ON t.leader_id = u.id
        ORDER BY t.name
      `);
    } else if (actor.role === 'onsite_leader' && actor.team_id) {
      // Onsite leader sees only their team
      teams = await getAll<TeamWithDetails>(`
        SELECT t.*, u.name as leader_name,
               (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
        FROM teams t
        LEFT JOIN users u ON t.leader_id = u.id
        WHERE t.id = $1
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

    const team = await getOne<TeamWithDetails>(`
      SELECT t.*, u.name as leader_name,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = $1
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

    const members = await getAll<TeamMember>(`
      SELECT id, employee_id, name, email, role, department
      FROM users
      WHERE team_id = $1
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
    const { name, description, leader_id } = req.body;

    // Get actor's permission info
    const actor = await getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = $1
    `, [user.id]);

    if (!actor || !canManageTeams(actor)) {
      return res.status(403).json({ error: 'Insufficient permissions to create teams' });
    }

    const result = await runQuery(`
      INSERT INTO teams (name, description, leader_id)
      VALUES ($1, $2, $3) RETURNING id
    `, [name, description || null, leader_id || null]);

    // If leader is specified, update their role to onsite_leader and assign to team
    if (leader_id) {
      await runQuery(`
        UPDATE users SET role = 'onsite_leader', team_id = $1
        WHERE id = $2
      `, [result.rows[0].id, leader_id]);
    }

    const newTeam = await getOne<TeamWithDetails>(`
      SELECT t.*, u.name as leader_name,
             0 as member_count
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = $1
    `, [result.rows[0].id]);

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
    const { name, description, leader_id } = req.body;

    // Get actor's permission info
    const actor = await getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = $1
    `, [user.id]);

    if (!actor || !canManageTeams(actor)) {
      return res.status(403).json({ error: 'Insufficient permissions to update teams' });
    }

    // Get current team
    const team = await getOne<{ id: number; leader_id: number | null }>(`
      SELECT id, leader_id FROM teams WHERE id = $1
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Handle leader change
    if (leader_id !== undefined && leader_id !== team.leader_id) {
      // Remove old leader's onsite_leader role
      if (team.leader_id) {
        await runQuery(`UPDATE users SET role = 'user' WHERE id = $1 AND role = 'onsite_leader'`, [team.leader_id]);
      }
      // Set new leader
      if (leader_id) {
        await runQuery(`UPDATE users SET role = 'onsite_leader', team_id = $1 WHERE id = $2`, [parseInt(id), leader_id]);
      }
    }

    await runQuery(`
      UPDATE teams SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        leader_id = COALESCE($3, leader_id)
      WHERE id = $4
    `, [name || null, description || null, leader_id !== undefined ? leader_id : null, parseInt(id)]);

    const updatedTeam = await getOne<TeamWithDetails>(`
      SELECT t.*, u.name as leader_name,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = $1
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
    const actor = await getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = $1
    `, [user.id]);

    if (!actor || !canManageTeams(actor)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete teams' });
    }

    // Get team
    const team = await getOne<{ id: number; leader_id: number | null }>(`
      SELECT id, leader_id FROM teams WHERE id = $1
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Remove team_id from all members
    await runQuery(`UPDATE users SET team_id = NULL WHERE team_id = $1`, [parseInt(id)]);

    // Remove onsite_leader role from the leader
    if (team.leader_id) {
      await runQuery(`UPDATE users SET role = 'user' WHERE id = $1 AND role = 'onsite_leader'`, [team.leader_id]);
    }

    // Delete the team
    await runQuery(`DELETE FROM teams WHERE id = $1`, [parseInt(id)]);

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
    const actor = await getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = $1
    `, [user.id]);

    // Get team
    const team = await getOne<{ id: number; leader_id: number | null }>(`
      SELECT id, leader_id FROM teams WHERE id = $1
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const canModify = actor?.role === 'admin' ||
      actor?.role === 'bod' ||
      actor?.role === 'gm' ||
      (actor?.role === 'onsite_leader' && actor.team_id === parseInt(id));

    if (!canModify) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await runQuery(`UPDATE users SET team_id = $1 WHERE id = $2`, [parseInt(id), user_id]);

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
    const actor = await getOne<UserPermissionInfo>(`
      SELECT id, role, department, department_id, team_id
      FROM users WHERE id = $1
    `, [user.id]);

    // Get team
    const team = await getOne<{ id: number; leader_id: number | null }>(`
      SELECT id, leader_id FROM teams WHERE id = $1
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const canModify = actor?.role === 'admin' ||
      actor?.role === 'bod' ||
      actor?.role === 'gm' ||
      (actor?.role === 'onsite_leader' && actor.team_id === parseInt(id));

    if (!canModify) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Cannot remove the team leader
    if (team.leader_id === parseInt(userId)) {
      return res.status(400).json({ error: 'Cannot remove team leader. Change leader first.' });
    }

    await runQuery(`UPDATE users SET team_id = NULL WHERE id = $1 AND team_id = $2`, [parseInt(userId), parseInt(id)]);

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

    const team = await getOne<{ id: number }>(`
      SELECT id FROM teams WHERE id = $1
    `, [parseInt(id)]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const availableUsers = await getAll<TeamMember>(`
      SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department
      FROM users u
      WHERE (u.team_id IS NULL OR u.team_id != $1)
      AND u.role NOT IN ('admin', 'bod', 'gm')
      ORDER BY u.name
    `, [parseInt(id)]);

    res.json(availableUsers);
  } catch (error) {
    console.error('Error fetching available members:', error);
    res.status(500).json({ error: 'Failed to fetch available members' });
  }
};
