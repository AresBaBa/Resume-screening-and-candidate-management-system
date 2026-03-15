import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useUserStore } from '@/stores/userStore';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiError {
  message: string;
  error?: string;
  status_code?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useUserStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('tazlyx error: 请求拦截器错误', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || error.message;

    if (status === 401) {
      useUserStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      console.error('tazlyx error: 权限不足', message);
    } else if (status === 404) {
      console.error('tazlyx error: 资源不存在', message);
    } else if (status === 500) {
      console.error('tazlyx error: 服务器内部错误', message);
    } else if (status === 502) {
      console.error('tazlyx error: 服务器网关错误', message);
    } else if (!status && !error.response) {
      console.error('tazlyx error: 网络错误，请检查网络连接');
    } else {
      console.error(`tazlyx error: API错误 (${status})`, message);
    }

    return Promise.reject(error);
  }
);

export const uploadWithProgress = (
  url: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = useUserStore.getState().token;

    xhr.open('POST', `${API_BASE_URL}${url}`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject({ response: { status: xhr.status, data: JSON.parse(xhr.responseText) } });
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    const formData = new FormData();
    formData.append('files', file);
    xhr.send(formData);
  });
};

export type StreamUploadMessage = 
  | { type: 'start'; index: number; file: string }
  | { type: 'progress'; index: number; message?: string; progress?: number }
  | { type: 'thinking'; index: number; content: string }
  | { type: 'completed'; index: number; data: any }
  | { type: 'error'; index: number; message: string };

export const streamUpload = (
  files: File[],
  onMessage: (data: StreamUploadMessage) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const token = useUserStore.getState().token;
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', `${API_BASE_URL}/api/resumes/stream-upload`);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });
    
    let buffer = '';
    
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState >= 3) {
        const newData = xhr.responseText.substring(buffer.length);
        buffer = xhr.responseText;
        
        const lines = newData.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              onMessage(data);
            } catch (e) {
              console.error('tazlyx error: 解析SSE数据失败', e);
            }
          }
        }
      }
      
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            reject({ response: { status: xhr.status, data: JSON.parse(xhr.responseText) } });
          } catch {
            reject({ response: { status: xhr.status, data: { error: 'Unknown error' } } });
          }
        }
      }
    });
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    xhr.send(formData);
  });
};

export default api;
