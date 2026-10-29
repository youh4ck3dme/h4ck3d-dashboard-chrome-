import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { FADE_MS, HOLD_MS, IMAGE_TIMEOUT_MS } from '../hooks/useWelcomeScreen';

const original = window.matchMedia;
let imageCount = 0;

function mockMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  imageCount = 0;
  vi.stubGlobal(
    'Image',
    class {
      decoding = '';
      src = '';
      constructor() {
        imageCount++;
      }
      decode() {
        return new Promise<void>(() => undefined); // never resolves → exercises the 800 ms fallback
      }
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.matchMedia = original;
});

const splash = () => screen.queryByRole('status', { name: 'Načítavam H4CK3D Project Timeline' });

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('WelcomeScreen', () => {
  beforeEach(() => sessionStorage.clear());

  it('does not replay on a reload within the same session', () => {
    mockMedia({ '(max-width: 1023px)': true });
    sessionStorage.setItem('h4ck3d:splash:lastActive', String(Date.now()));
    render(<App />);
    expect(splash()).toBeNull();
  });

  it('replays after 60 min in background, not after a short switch', () => {
    mockMedia({ '(max-width: 1023px)': true });
    sessionStorage.setItem('h4ck3d:splash:lastActive', String(Date.now()));
    render(<App />);

    act(() => setVisibility('hidden'));
    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    act(() => setVisibility('visible'));
    expect(splash()).toBeNull();

    act(() => setVisibility('hidden'));
    act(() => vi.advanceTimersByTime(60 * 60 * 1000));
    act(() => setVisibility('visible'));
    expect(splash()).toBeInTheDocument();
  });

  it('never renders or preloads on desktop', () => {
    mockMedia({});
    render(<App />);
    expect(splash()).toBeNull();
    expect(imageCount).toBe(0);
  });

  it('reveals the dashboard in at most 1.2 s (F8)', () => {
    mockMedia({ '(max-width: 1023px)': true });
    render(<App />);
    expect(splash()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(IMAGE_TIMEOUT_MS));
    act(() => vi.advanceTimersByTime(HOLD_MS));
    act(() => vi.advanceTimersByTime(FADE_MS));
    expect(IMAGE_TIMEOUT_MS + HOLD_MS + FADE_MS).toBeLessThanOrEqual(1200);
    expect(splash()).toBeNull();
  });

  it('can be skipped by a tap and by Escape (F8)', () => {
    mockMedia({ '(max-width: 1023px)': true });
    const first = render(<App />);
    fireEvent.pointerDown(splash()!);
    expect(splash()).toBeNull();
    first.unmount();

    sessionStorage.clear();
    render(<App />);
    expect(splash()).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(splash()).toBeNull();
  });

  it('shows on mobile, starts after the fallback and removes itself', () => {
    mockMedia({ '(max-width: 1023px)': true });
    render(<App />);
    expect(splash()).toBeInTheDocument();
    expect(imageCount).toBe(1);

    act(() => vi.advanceTimersByTime(IMAGE_TIMEOUT_MS));
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(splash()).toBeInTheDocument(); // fading
    act(() => vi.advanceTimersByTime(FADE_MS));
    expect(splash()).toBeNull();
  });

  it('skips the fade with reduced motion', () => {
    mockMedia({ '(max-width: 1023px)': true, '(prefers-reduced-motion: reduce)': true });
    render(<App />);
    act(() => vi.advanceTimersByTime(IMAGE_TIMEOUT_MS));
    act(() => vi.advanceTimersByTime(HOLD_MS));
    act(() => vi.advanceTimersByTime(0));
    expect(splash()).toBeNull();
  });
});
