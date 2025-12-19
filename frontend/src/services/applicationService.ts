import api from './api';
import { Application, ApplicationStatus } from '../types';

export interface CreateApplicationData {
  title: string;
  type: string;
  description: string;
  amount?: number;
  isDraft?: boolean;
  departmentId?: number;
  preferredDate?: string;
}

export interface UpdateApplicationData {
  title: string;
  type: string;
  description: string;
  amount?: number;
  isDraft?: boolean;
  departmentId?: number;
  preferredDate?: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus | 'all';
  type?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const applicationService = {
  getAll: async (filters?: ApplicationFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    const response = await api.get<Application[]>(`/applications?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  create: async (data: CreateApplicationData) => {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  },

  update: async (id: number, data: UpdateApplicationData) => {
    const response = await api.put<Application>(`/applications/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/applications/${id}`);
  },

  approve: async (id: number) => {
    const response = await api.post<Application>(`/applications/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason?: string) => {
    const response = await api.post<Application>(`/applications/${id}/reject`, { reason });
    return response.data;
  },

  addComment: async (id: number, content: string) => {
    const response = await api.post(`/applications/${id}/comments`, { content });
    return response.data;
  },
};
