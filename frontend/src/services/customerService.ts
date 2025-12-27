import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface Customer {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  team_ids: number[];
  team_names: string[];
}

export interface CustomerInput {
  name: string;
  description?: string;
  team_ids?: number[];
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const response = await axios.get(`${API_URL}/customers`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async getById(id: number): Promise<Customer> {
    const response = await axios.get(`${API_URL}/customers/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async create(data: CustomerInput): Promise<{ id: number; message: string }> {
    const response = await axios.post(`${API_URL}/customers`, data, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async update(id: number, data: Partial<Customer>): Promise<{ message: string }> {
    const response = await axios.put(`${API_URL}/customers/${id}`, data, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await axios.delete(`${API_URL}/customers/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
