import api from '../base';

export interface CandidateParams {
  page?: number;
  per_page?: number;
  job_id?: number;
  min_score?: number;
  max_score?: number;
  status?: string;
  city?: string;
  skill?: string;
  sort_by?: string;
  sort_order?: string;
}

export const candidateApi = {
  list: (params?: CandidateParams) =>
    api.get('/api/jobs/candidates', { params }),
  
  get: (id: number) => api.get(`/api/jobs/candidates/${id}`),
  
  updateStatus: (id: number, status: string) =>
    api.put(`/api/jobs/candidates/${id}/status`, { status }),
  
  batchUpdateStatus: (ids: number[], status: string) =>
    api.put('/api/jobs/candidates/batch-status', { application_ids: ids, status }),
  
  compare: (ids: number[]) => 
    api.post('/api/jobs/candidates/compare', { application_ids: ids }),
};
