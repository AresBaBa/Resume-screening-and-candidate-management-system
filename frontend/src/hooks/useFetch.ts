import { useState, useCallback, useEffect, useRef } from 'react';

interface UseFetchOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => Promise<T | undefined>;
  reset: () => void;
}

/**
 * 通用的数据获取 Hook
 * 封装了 Loading 状态管理、错误处理和防抖逻辑
 * 
 * @param fetcher - 返回 Promise 的异步函数
 * @param options - 配置选项
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { immediate = false, onSuccess, onError } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  
  const isInitialMount = useRef(true);
  const executingRef = useRef(false);

  const execute = useCallback(async () => {
    if (executingRef.current) return;
    executingRef.current = true;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
      executingRef.current = false;
    }
  }, [fetcher, onSuccess, onError]);

  useEffect(() => {
    if (immediate && isInitialMount.current) {
      isInitialMount.current = false;
      execute();
    }
  }, [immediate, execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    executingRef.current = false;
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * 分页数据获取 Hook
 * 适用于列表类 API
 */
export function usePaginatedFetch<T>(
  fetcher: (page: number, perPage: number) => Promise<T>,
  options: UseFetchOptions<T> & { perPage?: number } = {}
) {
  const { perPage: defaultPerPage = 12, ...fetchOptions } = options;
  
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  
  const { data, loading, error, execute, reset } = useFetch<T>(
    () => fetcher(page, perPage),
    fetchOptions
  );

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changePerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    page,
    perPage,
    goToPage,
    changePerPage,
    refresh,
    reset,
  };
}
