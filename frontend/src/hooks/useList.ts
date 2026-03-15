import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/lib/base';

interface ListResponse {
  jobs?: any[];
  resumes?: any[];
  items?: any[];
  total?: number;
}

interface UseListOptions {
  apiPath: string;
  defaultPage?: number;
  defaultPerPage?: number;
  filterKey?: string;
}

interface UseListReturn<T> {
  data: T[];
  total: number;
  loading: boolean;
  error: Error | null;
  page: number;
  perPage: number;
  filter: string;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  setFilter: (filter: string) => void;
  refresh: () => Promise<void>;
}

/**
 * 通用列表数据获取 Hook
 * 用于 jobs, resumes 等列表页面，减少重复代码
 * 
 * @param options - 配置选项
 * @param options.apiPath - API 路径，如 '/api/jobs'
 * @param options.defaultPage - 默认页码
 * @param options.defaultPerPage - 默认每页数量
 * @param options.filterKey - 筛选参数名，如 'status' 或 'parsing_status'
 */
export function useList<T>(options: UseListOptions): UseListReturn<T> {
  const {
    apiPath,
    defaultPage = 1,
    defaultPerPage = 12,
    filterKey = 'status'
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(defaultPage);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [filter, setFilter] = useState('');
  
  const isInitialMount = useRef(true);
  const executingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (executingRef.current) return;
    executingRef.current = true;
    
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, any> = { page, per_page: perPage };
      if (filter) {
        params[filterKey] = filter;
      }
      
      const response = await api.get(apiPath, { params });
      const responseData = response.data;
      
      let items: any[] = [];
      let totalCount = 0;
      
      if (Array.isArray(responseData)) {
        items = responseData;
        totalCount = responseData.length;
      } else if (responseData) {
        if (Array.isArray(responseData.jobs)) {
          items = responseData.jobs;
          totalCount = responseData.total || responseData.jobs.length;
        } else if (Array.isArray(responseData.resumes)) {
          items = responseData.resumes;
          totalCount = responseData.total || responseData.resumes.length;
        } else if (Array.isArray(responseData.items)) {
          items = responseData.items;
          totalCount = responseData.total || responseData.items.length;
        }
      }
      
      setData(items);
      setTotal(totalCount);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`tazlyx error: 获取列表失败 - ${apiPath}:`, error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      executingRef.current = false;
    }
  }, [apiPath, page, perPage, filter, filterKey]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  const handleSetFilter = useCallback((newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    total,
    loading,
    error,
    page,
    perPage,
    filter,
    setPage,
    setPerPage,
    setFilter: handleSetFilter,
    refresh,
  };
}
