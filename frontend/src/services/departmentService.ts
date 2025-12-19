import api from './api';

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface CreateDepartmentData {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateDepartmentData {
  code?: string;
  name?: string;
  description?: string;
}

export const departmentService = {
  getAll: async (activeOnly: boolean = false): Promise<Department[]> => {
    const params = activeOnly ? '?activeOnly=true' : '';
    const response = await api.get<Department[]>(`/departments${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Department> => {
    const response = await api.get<Department>(`/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentData): Promise<Department> => {
    const response = await api.post<Department>('/departments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDepartmentData): Promise<Department> => {
    const response = await api.put<Department>(`/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
