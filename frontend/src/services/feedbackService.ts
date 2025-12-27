import api from './api';

export interface FeedbackResponse {
  id: number;
  user_id: number;
  category: string;
  subject: string;
  content: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  responded_by: number | null;
  user_name?: string;
  user_email?: string;
  department?: string;
  responder_name?: string | null;
}

export interface Feedback {
  id: number;
  userId: number;
  category: string;
  subject: string;
  content: string;
  status: string;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  respondedBy: number | null;
  userName?: string;
  userEmail?: string;
  department?: string;
  responderName?: string | null;
}

export interface CreateFeedbackData {
  category: string;
  subject: string;
  content: string;
}

export interface UpdateFeedbackData {
  status?: string;
  adminResponse?: string;
}

const transformFeedback = (feedback: FeedbackResponse): Feedback => ({
  id: feedback.id,
  userId: feedback.user_id,
  category: feedback.category,
  subject: feedback.subject,
  content: feedback.content,
  status: feedback.status,
  adminResponse: feedback.admin_response,
  createdAt: feedback.created_at,
  updatedAt: feedback.updated_at,
  respondedAt: feedback.responded_at,
  respondedBy: feedback.responded_by,
  userName: feedback.user_name,
  userEmail: feedback.user_email,
  department: feedback.department,
  responderName: feedback.responder_name,
});

export const feedbackService = {
  getAll: async (status?: string): Promise<Feedback[]> => {
    const params = status && status !== 'all' ? { status } : {};
    const response = await api.get<FeedbackResponse[]>('/feedback', { params });
    return response.data.map(transformFeedback);
  },

  getById: async (id: number): Promise<Feedback> => {
    const response = await api.get<FeedbackResponse>(`/feedback/${id}`);
    return transformFeedback(response.data);
  },

  create: async (data: CreateFeedbackData): Promise<Feedback> => {
    const response = await api.post<FeedbackResponse>('/feedback', data);
    return transformFeedback(response.data);
  },

  update: async (id: number, data: UpdateFeedbackData): Promise<Feedback> => {
    const response = await api.put<FeedbackResponse>(`/feedback/${id}`, data);
    return transformFeedback(response.data);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/feedback/${id}`);
  },
};
