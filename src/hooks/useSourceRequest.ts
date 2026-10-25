import { useCallback, useEffect, useRef } from 'react';

/** Cancel stale imports on disconnect/unmount so they cannot restore deleted data. */
export function useSourceRequest() {
  const current = useRef<AbortController | null>(null);
  const cancel = useCallback(() => current.current?.abort(), []);
  const begin = useCallback(() => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    return controller.signal;
  }, []);
  useEffect(() => cancel, [cancel]);
  return { begin, cancel };
}
