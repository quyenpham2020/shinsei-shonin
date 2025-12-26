export interface User {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: 'user' | 'approver' | 'admin';
  mustChangePassword?: boolean;
}

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
