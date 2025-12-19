import api from './api';
import { User } from '../types';

export interface UserResponse {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: 'user' | 'approver' | 'admin';
  created_at: string;
}

export interface CreateUserData {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: 'user' | 'approver' | 'admin';
}

export interface UpdateUserData {
  employeeId?: string;
  name?: string;
  email?: string;
  department?: string;
  role?: 'user' | 'approver' | 'admin';
}

const transformUser = (user: UserResponse): User => ({
  id: user.id,
  employeeId: user.employee_id,
  name: user.name,
  email: user.email,
  department: user.department,
  role: user.role,
});

export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<UserResponse[]>('/users');
    return response.data.map(transformUser);
  },

  getById: async (id: number): Promise<User> => {
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

  changePassword: async (id: number, newPassword: string): Promise<void> => {
    await api.put(`/users/${id}/password`, { newPassword });
  },
};
