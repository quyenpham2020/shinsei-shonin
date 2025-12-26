import api from './api';

export interface PageFavorite {
  id: number;
  user_id: number;
  url: string;
  title: string;
  icon: string | null;
  created_at: string;
}

export interface TogglePageFavoriteResponse {
  is_favorite: boolean;
  message: string;
}

export interface CheckPageFavoriteResponse {
  is_favorite: boolean;
}

export const pageFavoriteService = {
  // ページお気に入り一覧取得
  getAll: async () => {
    const response = await api.get<PageFavorite[]>('/page-favorites');
    return response.data;
  },

  // ページお気に入り追加
  add: async (url: string, title: string, icon?: string) => {
    const response = await api.post<PageFavorite>('/page-favorites', { url, title, icon });
    return response.data;
  },

  // ページお気に入り切り替え
  toggle: async (url: string, title: string, icon?: string) => {
    const response = await api.post<TogglePageFavoriteResponse>('/page-favorites/toggle', { url, title, icon });
    return response.data;
  },

  // ページお気に入り削除
  remove: async (url: string) => {
    await api.delete('/page-favorites', { data: { url } });
  },

  // ページお気に入り状態チェック
  check: async (url: string) => {
    const response = await api.get<CheckPageFavoriteResponse>(`/page-favorites/check?url=${encodeURIComponent(url)}`);
    return response.data;
  },
};
