import api from './api';

export interface PasswordResetRequest {
  employeeId: string;
  email: string;
}

export interface PasswordResetResponse {
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface ForcePasswordChange {
  newPassword: string;
}

export interface TokenVerificationResponse {
  valid: boolean;
  message?: string;
  user?: {
    employeeId: string;
    name: string;
  };
}

export const passwordService = {
  // パスワードリセット申請
  requestReset: async (data: PasswordResetRequest): Promise<PasswordResetResponse> => {
    const response = await api.post('/password/reset-request', data);
    return response.data;
  },

  // トークン検証
  verifyToken: async (token: string): Promise<TokenVerificationResponse> => {
    const response = await api.get(`/password/verify-token/${token}`);
    return response.data;
  },

  // パスワードリセット (トークン認証)
  resetPassword: async (data: PasswordReset): Promise<{ message: string }> => {
    const response = await api.post('/password/reset', data);
    return response.data;
  },

  // パスワード変更 (ログイン後)
  changePassword: async (data: PasswordChange): Promise<{ message: string }> => {
    const response = await api.post('/password/change', data);
    return response.data;
  },

  // 初回ログイン時パスワード変更
  forceChangePassword: async (data: ForcePasswordChange): Promise<{ message: string }> => {
    const response = await api.post('/password/force-change', data);
    return response.data;
  },
};
