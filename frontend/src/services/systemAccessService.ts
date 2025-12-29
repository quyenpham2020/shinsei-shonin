import api from './api';

export interface UserWithAccess {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  team_name?: string;
  role: string;
  systems: string[];
}

export interface BulkUpdateRequest {
  userId: number;
  systems: string[];
}

export const systemAccessService = {
  getAllUsersWithAccess: async (): Promise<UserWithAccess[]> => {
    const response = await api.get<UserWithAccess[]>('/system-access/users');
    return response.data;
  },

  bulkUpdateAccess: async (updates: BulkUpdateRequest[]): Promise<void> => {
    await api.post('/system-access/bulk-update', { updates });
  },

  getMyAccess: async (): Promise<string[]> => {
    const response = await api.get<{ systems: string[] }>('/system-access/my-access');
    return response.data.systems;
  },
};
