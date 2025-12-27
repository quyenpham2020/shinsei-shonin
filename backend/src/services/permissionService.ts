import { getOne, getAll } from '../config/database';

// Role hierarchy levels (higher number = more authority)
export const ROLE_HIERARCHY = {
  user: 0,
  approver: 1,
  onsite_leader: 2,
  gm: 3,
  bod: 4,
  admin: 5,
} as const;

export type HierarchyRole = keyof typeof ROLE_HIERARCHY;

export interface UserPermissionInfo {
  id: number;
  role: string;
  department: string;
  department_id: number | null;
  team_id: number | null;
}

export interface TeamInfo {
  id: number;
  name: string;
  department_id: number;
  leader_id: number | null;
}

/**
 * Check if a user has authority over another user based on the hierarchy:
 * - BOD: Full authority over everyone including GM
 * - GM: Full authority over members in their department
 * - Onsite Leader: Full authority only over their team members
 * - Admin: Full authority (system administrator)
 */
export function hasAuthorityOver(
  actor: UserPermissionInfo,
  target: UserPermissionInfo
): boolean {
  // Same user - no authority over self in this context
  if (actor.id === target.id) {
    return false;
  }

  const actorLevel = ROLE_HIERARCHY[actor.role as HierarchyRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[target.role as HierarchyRole] ?? 0;

  // Admin has full authority over everyone
  if (actor.role === 'admin') {
    return true;
  }

  // BOD has full authority over everyone except admin
  if (actor.role === 'bod') {
    return target.role !== 'admin';
  }

  // GM has full authority over members in their department (except BOD and admin)
  if (actor.role === 'gm') {
    if (target.role === 'admin' || target.role === 'bod' || target.role === 'gm') {
      return false;
    }
    // Check if target is in the same department
    if (actor.department_id && actor.department_id === target.department_id) {
      return true;
    }
    // Fallback to department name comparison
    return actor.department === target.department;
  }

  // Onsite Leader has authority only over their team members
  if (actor.role === 'onsite_leader' && actor.team_id) {
    // Check if actor is leader of target's team
    if (target.team_id === actor.team_id) {
      // Only has authority over regular users and approvers in their team
      return targetLevel < ROLE_HIERARCHY.onsite_leader;
    }
    return false;
  }

  // Regular users and approvers don't have authority over others
  return false;
}

/**
 * Get all users that an actor has authority over
 */
export async function getUsersUnderAuthority(actorId: number): Promise<number[]> {
  const actor = getOne<UserPermissionInfo>(`
    SELECT id, role, department, department_id, team_id
    FROM users WHERE id = ?
  `, [actorId]);

  if (!actor) {
    return [];
  }

  // Admin sees all
  if (actor.role === 'admin') {
    const allUsers = getAll<{ id: number }>(`SELECT id FROM users WHERE id != ?`, [actorId]);
    return allUsers.map(u => u.id);
  }

  // BOD sees all except admins
  if (actor.role === 'bod') {
    const users = getAll<{ id: number }>(`
      SELECT id FROM users WHERE role != 'admin' AND id != ?
    `, [actorId]);
    return users.map(u => u.id);
  }

  // GM sees all in their department (except BOD, admin, other GMs)
  if (actor.role === 'gm') {
    let users: { id: number }[];
    if (actor.department_id) {
      users = getAll<{ id: number }>(`
        SELECT id FROM users
        WHERE department_id = ?
        AND role NOT IN ('admin', 'bod', 'gm')
        AND id != ?
      `, [actor.department_id, actorId]);
    } else {
      users = getAll<{ id: number }>(`
        SELECT id FROM users
        WHERE department = ?
        AND role NOT IN ('admin', 'bod', 'gm')
        AND id != ?
      `, [actor.department, actorId]);
    }
    return users.map(u => u.id);
  }

  // Onsite Leader sees their team members
  if (actor.role === 'onsite_leader' && actor.team_id) {
    const users = getAll<{ id: number }>(`
      SELECT id FROM users
      WHERE team_id = ?
      AND role IN ('user', 'approver')
      AND id != ?
    `, [actor.team_id, actorId]);
    return users.map(u => u.id);
  }

  return [];
}

/**
 * Check if a user can manage teams (create/edit/delete)
 * Only GM and above can manage teams in their scope
 */
export function canManageTeams(user: UserPermissionInfo): boolean {
  const level = ROLE_HIERARCHY[user.role as HierarchyRole] ?? 0;
  return level >= ROLE_HIERARCHY.gm;
}

/**
 * Get teams that a user can manage
 * - Admin: all teams
 * - BOD: all teams
 * - GM: teams in their department
 */
export function getManageableTeams(actorId: number): TeamInfo[] {
  const actor = getOne<UserPermissionInfo>(`
    SELECT id, role, department, department_id, team_id
    FROM users WHERE id = ?
  `, [actorId]);

  if (!actor) {
    return [];
  }

  if (actor.role === 'admin' || actor.role === 'bod') {
    return getAll<TeamInfo>(`
      SELECT id, name, department_id, leader_id
      FROM teams WHERE is_active = 1
    `);
  }

  if (actor.role === 'gm') {
    if (actor.department_id) {
      return getAll<TeamInfo>(`
        SELECT id, name, department_id, leader_id
        FROM teams WHERE department_id = ? AND is_active = 1
      `, [actor.department_id]);
    }
    // Fallback: match by department name
    const dept = getOne<{ id: number }>(`
      SELECT id FROM departments WHERE name = ?
    `, [actor.department]);
    if (dept) {
      return getAll<TeamInfo>(`
        SELECT id, name, department_id, leader_id
        FROM teams WHERE department_id = ? AND is_active = 1
      `, [dept.id]);
    }
  }

  return [];
}

/**
 * Check if user can assign someone as onsite leader
 */
export function canAssignOnsiteLeader(actor: UserPermissionInfo, targetUserId: number, teamId: number): boolean {
  // Only GM and above can assign onsite leaders
  if (!canManageTeams(actor)) {
    return false;
  }

  // Get team info
  const team = getOne<TeamInfo>(`
    SELECT id, name, department_id, leader_id
    FROM teams WHERE id = ?
  `, [teamId]);

  if (!team) {
    return false;
  }

  // Admin and BOD can assign anyone
  if (actor.role === 'admin' || actor.role === 'bod') {
    return true;
  }

  // GM can only assign within their department
  if (actor.role === 'gm') {
    if (actor.department_id) {
      return team.department_id === actor.department_id;
    }
    // Fallback check
    const dept = getOne<{ id: number }>(`
      SELECT id FROM departments WHERE name = ?
    `, [actor.department]);
    return dept?.id === team.department_id;
  }

  return false;
}

/**
 * Get role display name in Japanese
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    user: '一般ユーザー',
    approver: '承認者',
    onsite_leader: 'オンサイトリーダー',
    gm: 'GM（部門長）',
    bod: 'BOD（取締役）',
    admin: 'システム管理者',
  };
  return roleNames[role] || role;
}

/**
 * Get available roles that an actor can assign to users
 */
export function getAssignableRoles(actor: UserPermissionInfo): string[] {
  const actorLevel = ROLE_HIERARCHY[actor.role as HierarchyRole] ?? 0;

  // Can only assign roles lower than own level
  const assignable: string[] = [];
  for (const [role, level] of Object.entries(ROLE_HIERARCHY)) {
    if (level < actorLevel && role !== 'admin') {
      assignable.push(role);
    }
  }

  // Special case: admin can assign all roles
  if (actor.role === 'admin') {
    return Object.keys(ROLE_HIERARCHY);
  }

  return assignable;
}
