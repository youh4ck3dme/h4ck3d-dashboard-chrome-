import { useCallback, useEffect, useRef, useState } from 'react';
import { markActive, readLastActive, shouldPlay } from '../lib/splashPolicy';

export const SPLASH_SRC = '/splash/metal.webp';
export const SPLASH_QUERY = '(max-width: 1023px)';
export const IMAGE_TIMEOUT_MS = 800;
export const HOLD_MS = 2000;
export const FADE_MS = 250;

export type WelcomePhase = 'loading' | 'running' | 'fading' | 'done';

const mq = (q: string) => typeof window !== 'undefined' && (window.matchMedia?.(q).matches ?? false);

/**
 * Splash lifecycle for phones/tablets:
 * loading (image decode, max 800 ms) → running (2 s) → fading (250 ms, 0 with reduced motion) → done.
 * Plays on cold start and after ≥ 60 min in the background; never on desktop, never on a plain reload.
 */
export function useWelcomeScreen() {
  const [phase, setPhase] = useState<WelcomePhase>(() =>
    mq(SPLASH_QUERY) && shouldPlay(readLastActive()) ? 'loading' : 'done',
  );
  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Remember when the app was last active; replay after a long background stay.
  useEffect(() => {
    markActive();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markActive();
        return;
      }
      if (mq(SPLASH_QUERY) && shouldPlay(readLastActive())) setPhase('loading');
      markActive();
    };
    const onHide = () => markActive();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setPhase('running');
    };
    const img = new Image();
    img.decoding = 'async';
    img.src = SPLASH_SRC;
    (img.decode ? img.decode() : Promise.resolve()).then(start, start);
    later(start, IMAGE_TIMEOUT_MS);
    return () => {
      started = true;
      clearTimers();
    };
  }, [phase, later]);

  useEffect(() => {
    if (phase === 'running') later(() => setPhase('fading'), HOLD_MS);
    if (phase === 'fading')
      later(() => setPhase('done'), mq('(prefers-reduced-motion: reduce)') ? 0 : FADE_MS);
    return clearTimers;
  }, [phase, later]);

  return { show: phase !== 'done', phase };
}
