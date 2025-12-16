export interface User {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: 'user' | 'approver' | 'admin';
}

export interface Application {
  id: number;
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
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  comments?: Comment[];
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

export type ApplicationType = 'travel' | 'expense' | 'leave' | 'purchase' | 'other';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  travel: '出張申請',
  expense: '経費精算',
  leave: '休暇申請',
  purchase: '備品購入',
  other: 'その他',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: '審査中',
  approved: '承認済',
  rejected: '却下',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};
