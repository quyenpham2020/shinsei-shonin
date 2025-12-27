import i18n from '../i18n/config';

export type UserRole = 'user' | 'approver' | 'onsite_leader' | 'gm' | 'bod' | 'admin';

export interface User {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  departmentId?: number;
  teamId?: number;
  role: UserRole;
  mustChangePassword?: boolean;
}

export interface Team {
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

export interface TeamMember {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

// Helper function to get role labels with translations
export const getRoleLabel = (role: UserRole): string => {
  return i18n.t(`common:roles.${role}`);
};

// Legacy object for backwards compatibility
export const ROLE_LABELS: Record<UserRole, string> = {
  user: '一般ユーザー',
  approver: '承認者',
  onsite_leader: 'オンサイトリーダー',
  gm: 'GM（部門長）',
  bod: 'BOD（取締役）',
  admin: 'システム管理者',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  approver: 1,
  onsite_leader: 2,
  gm: 3,
  bod: 4,
  admin: 5,
};

export interface Application {
  id: number;
  application_number: string | null;
  title: string;
  type: ApplicationType;
  description: string;
  amount: number | null;
  status: ApplicationStatus;
  applicant_id: number;
  applicant_name: string;
  applicant_department: string;
  applicant_email?: string;
  approver_id: number | null;
  approver_name: string | null;
  department_id: number | null;
  preferred_date: string | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  comments?: Comment[];
  supplementary_applications?: Application[];
  total_amount?: number;
  is_favorite?: number;
}

export interface Comment {
  id: number;
  application_id: number;
  user_id: number;
  user_name: string;
  user_department: string;
  content: string;
  created_at: string;
}

export type ApplicationType = string;
export type ApplicationStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// Helper function to get status labels with translations
export const getStatusLabel = (status: ApplicationStatus): string => {
  return i18n.t(`application:status.${status}`);
};

// Legacy object for backwards compatibility
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: '下書き',
  pending: '審査中',
  approved: '承認済',
  rejected: '却下',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};
