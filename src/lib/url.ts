/**
 * Returns a normalized absolute http(s) URL, or undefined for anything else
 * (javascript:, data:, malformed input). Use for every href built from API data.
 */
export function safeExternalUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = input.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Strips protocol and trailing slash for display. */
export function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
