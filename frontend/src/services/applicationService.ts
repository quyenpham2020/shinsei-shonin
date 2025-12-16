import api from './api';
import { Application, ApplicationType, ApplicationStatus } from '../types';

export interface CreateApplicationData {
  title: string;
  type: ApplicationType;
  description: string;
  amount?: number;
}

export const applicationService = {
  getAll: async (filters?: { status?: ApplicationStatus | 'all'; type?: ApplicationType | 'all' }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
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
