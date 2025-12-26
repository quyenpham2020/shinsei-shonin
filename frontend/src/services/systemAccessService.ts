import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UserWithAccess {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  systems: string[];
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const systemAccessService = {
  // Get current user's system access
  getMyAccess: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/system-access/my-access`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Get all users with their system access (admin only)
  getAllUsersWithAccess: async (): Promise<UserWithAccess[]> => {
    const response = await axios.get(`${API_BASE_URL}/system-access/users`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Get system access for a specific user (admin only)
  getUserAccess: async (userId: number): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/system-access/users/${userId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Update system access for a user (admin only)
  updateUserAccess: async (userId: number, systems: string[]): Promise<void> => {
    await axios.put(
      `${API_BASE_URL}/system-access/users/${userId}`,
      { systems },
      { headers: getAuthHeader() }
    );
  },

  // Bulk update access (admin only)
  bulkUpdateAccess: async (updates: { userId: number; systems: string[] }[]): Promise<void> => {
    await axios.post(
      `${API_BASE_URL}/system-access/bulk-update`,
      { updates },
      { headers: getAuthHeader() }
    );
  },
};
