import api from './api';

export interface ApplicationType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  requires_amount: number;
  requires_attachment: number;
  approval_levels: number;
  display_order: number;
  is_active: number;
  created_at: string;
}

export interface CreateApplicationTypeData {
  code: string;
  name: string;
  description?: string;
  requiresAmount?: boolean;
  requiresAttachment?: boolean;
  approvalLevels?: number;
  displayOrder?: number;
}

export interface UpdateApplicationTypeData {
  code?: string;
  name?: string;
  description?: string;
  requiresAmount?: boolean;
  requiresAttachment?: boolean;
  approvalLevels?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export const applicationTypeService = {
  getAll: async (includeInactive = false): Promise<ApplicationType[]> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await api.get<ApplicationType[]>(`/application-types${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<ApplicationType> => {
    const response = await api.get<ApplicationType>(`/application-types/${id}`);
    return response.data;
  },

  create: async (data: CreateApplicationTypeData): Promise<ApplicationType> => {
    const response = await api.post<ApplicationType>('/application-types', data);
    return response.data;
  },

  update: async (id: number, data: UpdateApplicationTypeData): Promise<ApplicationType> => {
    const response = await api.put<ApplicationType>(`/application-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/application-types/${id}`);
  },
};
