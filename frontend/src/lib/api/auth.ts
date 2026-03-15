import api from '../base';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post('/api/auth/register', data),
  
  me: () => api.get('/api/auth/me'),
  
  updateProfile: (data: { name?: string; phone?: string }) => 
    api.put('/api/auth/me', data),
  
  refresh: () => api.post('/api/auth/refresh'),
};
