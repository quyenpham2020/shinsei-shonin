import api from './api';

export interface SettingResponse {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: number;
  settingKey: string;
  settingValue: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSettingResponse {
  key: string;
  value: string;
  enabled: boolean;
}

export interface CreateSettingData {
  settingKey: string;
  settingValue: string;
  description?: string;
}

export interface UpdateSettingData {
  value: string;
}

const transformSetting = (setting: SettingResponse): Setting => ({
  id: setting.id,
  settingKey: setting.setting_key,
  settingValue: setting.setting_value,
  description: setting.description,
  createdAt: setting.created_at,
  updatedAt: setting.updated_at,
});

export const settingsService = {
  getAll: async (): Promise<Setting[]> => {
    const response = await api.get<SettingResponse[]>('/settings');
    return response.data.map(transformSetting);
  },

  getByKey: async (key: string): Promise<Setting> => {
    const response = await api.get<SettingResponse>(`/settings/${key}`);
    return transformSetting(response.data);
  },

  getPublicSetting: async (key: string): Promise<PublicSettingResponse> => {
    const response = await api.get<PublicSettingResponse>(`/settings/public/${key}`);
    return response.data;
  },

  create: async (data: CreateSettingData): Promise<Setting> => {
    const response = await api.post<SettingResponse>('/settings', data);
    return transformSetting(response.data);
  },

  update: async (key: string, data: UpdateSettingData): Promise<Setting> => {
    const response = await api.put<SettingResponse>(`/settings/${key}`, data);
    return transformSetting(response.data);
  },

  delete: async (key: string): Promise<void> => {
    await api.delete(`/settings/${key}`);
  },
};
