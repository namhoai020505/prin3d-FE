import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePagedQueryOptions<T> {
  queryFn: (page: number, signal: AbortSignal) => Promise<T[]>;
  initialPage?: number;
  pageSize?: number;
  dependencies?: unknown[];
}

export interface UsePagedQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  statusCode: number | null;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setPage: (newPage: number | ((prev: number) => number)) => void;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => void;
}

export function usePagedQuery<T>({
  queryFn,
  initialPage = 1,
  pageSize = 20,
  dependencies = [],
}: UsePagedQueryOptions<T>): UsePagedQueryResult<T> {
  const [page, setPageState] = useState<number>(initialPage);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Keep a stable ref to queryFn to prevent unnecessary re-runs
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const setPage = useCallback((newPageOrUpdater: number | ((prev: number) => number)) => {
    setPageState((prev) => {
      const next = typeof newPageOrUpdater === 'function' ? newPageOrUpdater(prev) : newPageOrUpdater;
      return Math.max(1, next);
    });
  }, []);

  const nextPage = useCallback(() => {
    setPageState((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageState((prev) => Math.max(1, prev - 1));
  }, []);

  const refetch = useCallback(() => {
    setReloadTrigger((v) => v + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    const execute = async () => {
      setLoading(true);
      setError(null);
      setStatusCode(null);

      try {
        const result = await queryFnRef.current(page, controller.signal);
        if (!isCancelled) {
          setData(Array.isArray(result) ? result : []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isCancelled || controller.signal.aborted) {
          return;
        }

        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string; detail?: string } };
          message?: string;
        };

        const status = axiosErr.response?.status ?? null;
        setStatusCode(status);

        if (status === 403) {
          setError('Bạn không có quyền truy cập dữ liệu này.');
        } else {
          const msg =
            axiosErr.response?.data?.detail ||
            axiosErr.response?.data?.message ||
            axiosErr.message ||
            'Không thể tải dữ liệu. Vui lòng thử lại sau.';
          setError(msg);
        }
        setData([]);
        setLoading(false);
      }
    };

    void execute();

    return () => {
      isCancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, reloadTrigger, ...dependencies]);

  const hasPrevPage = page > 1;
  const hasNextPage = data.length >= pageSize;

  return {
    data,
    loading,
    error,
    statusCode,
    page,
    hasNextPage,
    hasPrevPage,
    setPage,
    nextPage,
    prevPage,
    refetch,
  };
}

export default usePagedQuery;

