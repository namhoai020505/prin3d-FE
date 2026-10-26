import { useCallback, useEffect, useRef, useState } from 'react';

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';

export function useStaffData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef({ version: 0 });
  const reload = useCallback(async () => {
    const id = ++request.current.version;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (request.current.version === id) setData(result);
    } catch (err) {
      if (request.current.version === id) setError(errorMessage(err));
    } finally {
      if (request.current.version === id) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    const state = request.current;
    const id = ++state.version;
    void load().then(result => {
      if (state.version === id) { setData(result); setError(null); }
    }).catch(err => {
      if (state.version === id) setError(errorMessage(err));
    }).finally(() => {
      if (state.version === id) setLoading(false);
    });
    return () => { state.version++; };
  }, [load]);
  return { data, loading, error, reload };
}
