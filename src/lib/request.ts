/** Every API request has a deadline, supports cancellation and refuses redirects with credentials. */
export function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
}
