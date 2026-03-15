import api, { uploadWithProgress, streamUpload, StreamUploadMessage } from '../base';

export interface ResumeParams {
  page?: number;
  per_page?: number;
  parsing_status?: string;
}

export interface ResumeData {
  id: number;
  filename?: string;
  file_path?: string;
  parsing_status?: string;
  parsed_data?: any;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
}

export const resumeApi = {
  list: (params?: ResumeParams) =>
    api.get('/api/resumes', { params }),
  
  my: () => api.get('/api/resumes/my'),
  
  get: (id: number) => api.get(`/api/resumes/${id}`),
  
  update: (id: number, data: Partial<ResumeData>) => 
    api.put(`/api/resumes/${id}`, data),
  
  upload: (formData: FormData) =>
    api.post('/api/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  streamUpload: (files: File[], onMessage: (data: StreamUploadMessage) => void) =>
    streamUpload(files, onMessage),
  
  delete: (id: number) => api.delete(`/api/resumes/${id}`),
  
  reparse: (id: number) => api.post(`/api/resumes/${id}/reparse`),
  
  thumbnail: (id: number) => api.get(`/api/resumes/${id}/thumbnail`, { responseType: 'blob' }),
  
  download: (id: number) => api.get(`/api/resumes/${id}/download`, { responseType: 'blob' }),
};

export type { StreamUploadMessage };
