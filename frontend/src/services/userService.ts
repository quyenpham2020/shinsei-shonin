import api from './api';
import { User, UserRole } from '../types';

export interface UserResponse {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  weekly_report_exempt?: number;
  created_at: string;
}

export interface CreateUserData {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: UserRole;
}

export interface UpdateUserData {
  employeeId?: string;
  name?: string;
  email?: string;
  department?: string;
  role?: UserRole;
  weeklyReportExempt?: boolean;
}

const transformUser = (user: UserResponse): User & { weekly_report_exempt?: number } => ({
  id: user.id,
  employeeId: user.employee_id,
  name: user.name,
  email: user.email,
  department: user.department,
  role: user.role,
  weekly_report_exempt: user.weekly_report_exempt,
});

export const userService = {
  getAll: async (): Promise<(User & { weekly_report_exempt?: number })[]> => {
    const response = await api.get<UserResponse[]>('/users');
    return response.data.map(transformUser);
  },

  getById: async (id: number): Promise<User & { weekly_report_exempt?: number }> => {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return transformUser(response.data);
  },

  create: async (data: CreateUserData): Promise<User> => {
    const response = await api.post<UserResponse>('/users', data);
    return transformUser(response.data);
  },

  update: async (id: number, data: UpdateUserData): Promise<User> => {
    const response = await api.put<UserResponse>(`/users/${id}`, data);
    return transformUser(response.data);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    await api.post('/users/bulk-delete', { ids });
  },

  changePassword: async (id: number, newPassword: string): Promise<void> => {
    await api.put(`/users/${id}/password`, { newPassword });
  },

  getApprovers: async (): Promise<User[]> => {
    const response = await api.get<UserResponse[]>('/users/approvers');
    return response.data.map(transformUser);
  },
};
