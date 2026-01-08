import axios from 'axios';

const API_URL = '/api';

export interface LoginLog {
  id: number;
  user_id: number;
  employee_id: string;
  username: string;
  ip_address: string;
  user_agent: string;
  browser: string;
  os: string;
  device: string;
  country: string;
  region: string;
  city: string;
  timezone: string;
  login_status: 'success' | 'failed';
  failure_reason?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  employee_id: string;
  username: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  description?: string;
  ip_address: string;
  user_agent: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

export interface PasswordChangeLog {
  id: number;
  user_id: number;
  employee_id: string;
  username: string;
  change_type: 'reset' | 'change' | 'force_reset';
  changed_by?: number;
  changed_by_name?: string;
  ip_address: string;
  user_agent: string;
  is_forced: boolean;
  created_at: string;
}

export interface AuditLogResponse<T> {
  logs: T[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const getLoginLogs = async (params?: {
  limit?: number;
  offset?: number;
  userId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLogResponse<LoginLog>> => {
  const response = await axios.get(`${API_URL}/audit/login-logs`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getAuditLogs = async (params?: {
  limit?: number;
  offset?: number;
  userId?: number;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLogResponse<AuditLog>> => {
  const response = await axios.get(`${API_URL}/audit/audit-logs`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getPasswordChangeLogs = async (params?: {
  limit?: number;
  offset?: number;
  userId?: number;
  changeType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLogResponse<PasswordChangeLog>> => {
  const response = await axios.get(`${API_URL}/audit/password-logs`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getAllAuditLogs = async (params?: {
  limit?: number;
}): Promise<{ logs: any[] }> => {
  const response = await axios.get(`${API_URL}/audit/all`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};
