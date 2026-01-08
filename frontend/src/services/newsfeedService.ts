import axios from 'axios';

const API_URL = '/api';

export interface NewsfeedPost {
  id: number;
  user_id: number;
  content: string;
  post_type: 'general' | 'knowhow' | 'tip';
  category?: string;
  is_anonymous: boolean;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  author_name: string;
  author_department?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsfeedComment {
  id: number;
  post_id: number;
  user_id: number;
  parent_comment_id?: number;
  content: string;
  is_anonymous: boolean;
  author_name: string;
  author_department?: string;
  created_at: string;
  updated_at: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const newsfeedService = {
  // Get all posts
  getPosts: async (params?: {
    limit?: number;
    offset?: number;
    type?: string;
    category?: string;
  }) => {
    const response = await axios.get(`${API_URL}/newsfeed`, {
      ...getAuthHeader(),
      params,
    });
    return response.data;
  },

  // Get single post
  getPost: async (id: number) => {
    const response = await axios.get(`${API_URL}/newsfeed/${id}`, getAuthHeader());
    return response.data;
  },

  // Create post
  createPost: async (data: {
    content: string;
    postType?: string;
    category?: string;
    isAnonymous?: boolean;
    imageUrl?: string;
  }) => {
    const response = await axios.post(`${API_URL}/newsfeed`, data, getAuthHeader());
    return response.data;
  },

  // Update post
  updatePost: async (
    id: number,
    data: {
      content?: string;
      postType?: string;
      category?: string;
      imageUrl?: string;
    }
  ) => {
    const response = await axios.put(`${API_URL}/newsfeed/${id}`, data, getAuthHeader());
    return response.data;
  },

  // Delete post
  deletePost: async (id: number) => {
    const response = await axios.delete(`${API_URL}/newsfeed/${id}`, getAuthHeader());
    return response.data;
  },

  // Add comment
  addComment: async (
    postId: number,
    data: {
      content: string;
      isAnonymous?: boolean;
      parentCommentId?: number;
    }
  ) => {
    const response = await axios.post(
      `${API_URL}/newsfeed/${postId}/comments`,
      data,
      getAuthHeader()
    );
    return response.data;
  },

  // Delete comment
  deleteComment: async (postId: number, commentId: number) => {
    const response = await axios.delete(
      `${API_URL}/newsfeed/${postId}/comments/${commentId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Toggle like
  toggleLike: async (postId: number) => {
    const response = await axios.post(`${API_URL}/newsfeed/${postId}/like`, {}, getAuthHeader());
    return response.data;
  },

  // Check if liked
  checkLike: async (postId: number) => {
    const response = await axios.get(`${API_URL}/newsfeed/${postId}/like/check`, getAuthHeader());
    return response.data;
  },

  // Upload attachment for post
  uploadPostAttachment: async (postId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(
      `${API_URL}/newsfeed/posts/${postId}/attachments`,
      formData,
      {
        ...getAuthHeader(),
        headers: {
          ...getAuthHeader().headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Upload attachment for comment
  uploadCommentAttachment: async (commentId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(
      `${API_URL}/newsfeed/comments/${commentId}/attachments`,
      formData,
      {
        ...getAuthHeader(),
        headers: {
          ...getAuthHeader().headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get attachments for post
  getPostAttachments: async (postId: number) => {
    const response = await axios.get(
      `${API_URL}/newsfeed/posts/${postId}/attachments`,
      getAuthHeader()
    );
    return response.data;
  },

  // Get attachment URL
  getAttachmentUrl: (attachmentId: number) => {
    return `${API_URL}/newsfeed/attachments/${attachmentId}`;
  },

  // Delete attachment
  deleteAttachment: async (attachmentId: number) => {
    const response = await axios.delete(
      `${API_URL}/newsfeed/attachments/${attachmentId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Reactions (new system)
  toggleReaction: async (postId: number, reactionType: string) => {
    const response = await axios.post(
      `${API_URL}/newsfeed/${postId}/reaction`,
      { reactionType },
      getAuthHeader()
    );
    return response.data;
  },

  getUserReaction: async (postId: number) => {
    const response = await axios.get(
      `${API_URL}/newsfeed/${postId}/reaction`,
      getAuthHeader()
    );
    return response.data;
  },

  getReactionCounts: async (postId: number) => {
    const response = await axios.get(
      `${API_URL}/newsfeed/${postId}/reaction-counts`,
      getAuthHeader()
    );
    return response.data;
  },
};
