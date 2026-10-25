/** Marks installed-PWA mode without restricting pinch or keyboard zoom. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = (q: string) => window.matchMedia?.(q).matches ?? false;
  return (
    mq('(display-mode: standalone)') ||
    mq('(display-mode: fullscreen)') ||
    mq('(display-mode: window-controls-overlay)') ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function lockNativeShell() {
  if (typeof document !== 'undefined') document.documentElement.dataset.standalone = String(isStandalone());
}
