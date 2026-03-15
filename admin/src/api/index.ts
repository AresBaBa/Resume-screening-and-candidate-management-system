import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
}

export const jobs = {
  list: (params?: any) => api.get('/jobs', { params }),
  get: (id: number) => api.get(`/jobs/${id}`),
  create: (data: any) => api.post('/jobs', data),
  update: (id: number, data: any) => api.put(`/jobs/${id}`, data),
  delete: (id: number) => api.delete(`/jobs/${id}`),
}

export const candidates = {
  list: (params?: any) => api.get('/candidates', { params }),
  get: (id: number) => api.get(`/candidates/${id}`),
  update: (id: number, data: any) => api.put(`/candidates/${id}`, data),
}

export const applications = {
  list: (params?: any) => api.get('/applications', { params }),
  get: (id: number) => api.get(`/applications/${id}`),
  update: (id: number, data: any) => api.put(`/applications/${id}`, data),
}

export const resumes = {
  list: (params?: any) => api.get('/resumes', { params }),
  get: (id: number) => api.get(`/resumes/${id}`),
  delete: (id: number) => api.delete(`/resumes/${id}`),
}

export const ai = {
  parseResume: (resumeId: number) => api.post(`/ai/parse-resume/${resumeId}`),
  scoreApplication: (applicationId: number) => api.post(`/ai/score-application/${applicationId}`),
  generateQuestions: (jobId: number) => api.get(`/ai/generate-interview-questions/${jobId}`),
}

export default api
