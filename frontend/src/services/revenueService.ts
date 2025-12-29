import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface RevenueRecord {
  id: number;
  customer_id: number;
  customer_name: string;
  team_names?: string[];
  year: number;
  month: number;
  mm_onsite: number;
  mm_offshore: number;
  unit_price: number; // Legacy field
  unit_price_onsite: number;
  unit_price_offshore: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface RevenueInput {
  customer_id: number;
  year: number;
  month: number;
  mm_onsite: number;
  mm_offshore: number;
  unit_price?: number; // Legacy field - optional for backward compatibility
  unit_price_onsite?: number;
  unit_price_offshore?: number;
  notes?: string;
}

export interface RevenueStats {
  total_revenue: number;
  total_mm_onsite: number;
  total_mm_offshore: number;
  record_count: number;
  records: RevenueRecord[];
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const revenueService = {
  async getAll(): Promise<RevenueRecord[]> {
    const response = await axios.get(`${API_URL}/revenue`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async getById(id: number): Promise<RevenueRecord> {
    const response = await axios.get(`${API_URL}/revenue/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async getByCustomer(customerId: number): Promise<RevenueRecord[]> {
    const response = await axios.get(`${API_URL}/revenue/customer/${customerId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async getStats(params?: {
    customer_id?: number;
    start_year?: number;
    start_month?: number;
    end_year?: number;
    end_month?: number;
  }): Promise<RevenueStats> {
    const response = await axios.get(`${API_URL}/revenue/stats`, {
      headers: getAuthHeader(),
      params,
    });
    return response.data;
  },

  async create(data: RevenueInput): Promise<{ id: number; message: string }> {
    const response = await axios.post(`${API_URL}/revenue`, data, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async update(id: number, data: Partial<RevenueInput>): Promise<{ message: string }> {
    const response = await axios.put(`${API_URL}/revenue/${id}`, data, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await axios.delete(`${API_URL}/revenue/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
