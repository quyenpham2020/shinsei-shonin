import api from './api';
import { Application } from '../types';

export interface ToggleFavoriteResponse {
  is_favorite: boolean;
  message: string;
}

export interface CheckFavoriteResponse {
  is_favorite: boolean;
}

export const favoriteService = {
  // お気に入り一覧取得
  getAll: async () => {
    const response = await api.get<Application[]>('/favorites');
    return response.data;
  },

  // お気に入り切り替え
  toggle: async (applicationId: number) => {
    const response = await api.post<ToggleFavoriteResponse>(`/favorites/${applicationId}/toggle`);
    return response.data;
  },

  // お気に入り状態チェック
  check: async (applicationId: number) => {
    const response = await api.get<CheckFavoriteResponse>(`/favorites/${applicationId}/check`);
    return response.data;
  },

  // お気に入り削除
  remove: async (applicationId: number) => {
    await api.delete(`/favorites/${applicationId}`);
  },
};
