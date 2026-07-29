import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiDataResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Fetches `fetcher()` on mount, optionally re-polls every `intervalMs`.
 * Deliberately simple (no cache, no dedupe) -- this dashboard has a small,
 * known set of consumers per endpoint, so a request-caching library would
 * be more machinery than the problem needs.
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  intervalMs?: number
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = load();
    if (!intervalMs) return cancel;
    const id = setInterval(load, intervalMs);
    return () => {
      cancel();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs]);

  return { data, error, loading, refetch: load };
}
