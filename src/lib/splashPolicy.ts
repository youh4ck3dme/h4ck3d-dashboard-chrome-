/**
 * When should the welcome screen play?
 * - cold start: the app/tab was fully closed (no session marker) → yes
 * - reload while the session is alive → no
 * - returning from background after ≥ 60 min → yes
 *
 * sessionStorage survives reloads but is cleared when the app/tab is closed,
 * which is exactly the "fully closed" signal we need.
 */
export const RESUME_AFTER_MS = 60 * 60 * 1000;
const KEY = 'h4ck3d:splash:lastActive';

export function readLastActive(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function markActive(now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, String(now));
  } catch {
    /* storage unavailable — treated as cold start next time */
  }
}

/** True when the splash should play given the last time the app was seen active. */
export function shouldPlay(lastActive: number | null, now = Date.now()): boolean {
  return lastActive === null || now - lastActive >= RESUME_AFTER_MS;
}
