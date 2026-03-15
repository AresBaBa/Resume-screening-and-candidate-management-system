import api from '../base';

export interface JobParams {
  page?: number;
  per_page?: number;
  status?: string;
  location?: string;
}

export interface JobData {
  title: string;
  description: string;
  requirements?: string[];
  skills_required?: string[];
  skills_preferred?: string[];
  location?: string;
  salary_range?: string;
  employment_type?: string;
  status?: string;
}

export interface CandidateParams {
  page?: number;
  per_page?: number;
  min_score?: number;
  max_score?: number;
  status?: string;
  city?: string;
  skill?: string;
  sort_by?: string;
  sort_order?: string;
}

export const jobApi = {
  list: (params?: JobParams) =>
    api.get('/api/jobs', { params }),
  
  get: (id: number) => api.get(`/api/jobs/${id}`),
  
  create: (data: JobData) => api.post('/api/jobs', data),
  
  update: (id: number, data: Partial<JobData>) => 
    api.put(`/api/jobs/${id}`, data),
  
  delete: (id: number) => api.delete(`/api/jobs/${id}`),
  
  match: (jobId: number, data?: { resume_ids?: number[]; skip_existing?: boolean }) =>
    api.post(`/api/jobs/${jobId}/match`, data),
  
  candidates: (jobId: number, params?: CandidateParams) =>
    api.get(`/api/jobs/${jobId}/candidates`, { params }),
  
  getCandidate: (jobId: number, candidateId: number) =>
    api.get(`/api/jobs/${jobId}/candidates/${candidateId}`),
  
  updateCandidateStatus: (jobId: number, candidateId: number, status: string) =>
    api.put(`/api/jobs/${jobId}/candidates/${candidateId}/status`, { status }),
};
