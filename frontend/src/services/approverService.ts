import api from './api';

export interface Approver {
  id: number;
  user_id: number;
  user_name: string;
  user_employee_id: string;
  department_id: number;
  department_name: string;
  department_code: string;
  approval_level: number;
  max_amount: number | null;
  is_active: number;
  created_at: string;
}

export interface ApproverCandidate {
  id: number;
  employee_id: string;
  name: string;
  department: string;
  role: string;
}

export interface ApproverDepartment {
  department_id: number;
  department_name: string;
  department_code: string;
  approval_level: number;
  max_amount: number | null;
}

export interface CreateApproverData {
  userId: number;
  departmentId: number;
  approvalLevel?: number;
  maxAmount?: number | null;
}

export interface UpdateApproverData {
  approvalLevel?: number;
  maxAmount?: number | null;
  isActive?: boolean;
}

export const approverService = {
  getAll: async (filters?: { departmentId?: number; userId?: number }): Promise<Approver[]> => {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('department_id', String(filters.departmentId));
    if (filters?.userId) params.append('user_id', String(filters.userId));
    const response = await api.get<Approver[]>(`/approvers?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<Approver> => {
    const response = await api.get<Approver>(`/approvers/${id}`);
    return response.data;
  },

  create: async (data: CreateApproverData): Promise<Approver> => {
    const response = await api.post<Approver>('/approvers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateApproverData): Promise<Approver> => {
    const response = await api.put<Approver>(`/approvers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/approvers/${id}`);
  },

  getCandidates: async (): Promise<ApproverCandidate[]> => {
    const response = await api.get<ApproverCandidate[]>('/approvers/candidates');
    return response.data;
  },

  getMyDepartments: async (): Promise<ApproverDepartment[]> => {
    const response = await api.get<ApproverDepartment[]>('/approvers/my-departments');
    return response.data;
  },
};
