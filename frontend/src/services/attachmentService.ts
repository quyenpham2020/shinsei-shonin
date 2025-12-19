import api from './api';

export interface Attachment {
  id: number;
  application_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  uploaded_by: number;
  uploader_name?: string;
  created_at: string;
}

export const attachmentService = {
  getByApplicationId: async (applicationId: number): Promise<Attachment[]> => {
    const response = await api.get<Attachment[]>(`/applications/${applicationId}/attachments`);
    return response.data;
  },

  upload: async (applicationId: number, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<Attachment>(
      `/applications/${applicationId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  download: async (id: number, fileName: string): Promise<void> => {
    const response = await api.get(`/attachments/${id}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/attachments/${id}`);
  },
};
