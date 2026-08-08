import { useCallback, useEffect, useState } from 'react';

export type AsyncData<T> = {
  data: T | null;
  /** Message from a rejected fetch, or null. */
  error: string | null;
  /** True until the first load settles. */
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
};

/**
 * Loads once on mount, and again on pull-to-refresh.
 *
 * `fetcher` should throw on failure — the message is surfaced via `error`.
 * It must be referentially stable, so wrap it in `useCallback`.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async () => {
    try {
      setData(await fetcher());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await run();
      // The component may have unmounted while the request was in flight.
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [run]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  return { data, error, loading, refreshing, refresh };
}
