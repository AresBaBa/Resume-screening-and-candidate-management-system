import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：在请求头中注入 admin_token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理 401 未授权错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 失效，清除本地缓存并重定向到登录页
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 身份验证相关接口
export const auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
}

// 职位管理相关接口
export const jobs = {
  list: (params?: any) => api.get('/jobs', { params }),
  get: (id: number) => api.get(`/jobs/${id}`),
  create: (data: any) => api.post('/jobs', data),
  update: (id: number, data: any) => api.put(`/jobs/${id}`, data),
  delete: (id: number) => api.delete(`/jobs/${id}`),
}

// 候选人管理相关接口
export const candidates = {
  list: (params?: any) => api.get('/candidates', { params }),
  get: (id: number) => api.get(`/candidates/${id}`),
  update: (id: number, data: any) => api.put(`/candidates/${id}`, data),
}

// 投递申请管理相关接口
export const applications = {
  list: (params?: any) => api.get('/applications', { params }),
  get: (id: number) => api.get(`/applications/${id}`),
  update: (id: number, data: any) => api.put(`/applications/${id}`, data),
}

// 简历库管理相关接口
export const resumes = {
  list: (params?: any) => api.get('/resumes', { params }),
  get: (id: number) => api.get(`/resumes/${id}`),
  delete: (id: number) => api.delete(`/resumes/${id}`),
}

// AI 增强功能接口
export const ai = {
  // 解析指定简历
  parseResume: (resumeId: number) => api.post(`/ai/parse-resume/${resumeId}`),
  // 对申请记录进行 AI 打分
  scoreApplication: (applicationId: number) => api.post(`/ai/score-application/${applicationId}`),
  // 根据职位生成面试问题
  generateQuestions: (jobId: number) => api.get(`/ai/generate-interview-questions/${jobId}`),
}

export default api
