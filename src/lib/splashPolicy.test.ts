import { describe, expect, it } from 'vitest';
import { RESUME_AFTER_MS, markActive, readLastActive, shouldPlay } from './splashPolicy';

describe('splash policy', () => {
  it('plays on cold start (no session marker)', () => {
    sessionStorage.clear();
    expect(shouldPlay(readLastActive())).toBe(true);
  });

  it('does not play on reload within the session', () => {
    markActive(1_000);
    expect(shouldPlay(readLastActive(), 1_000 + 5_000)).toBe(false);
  });

  it('plays again after 60 minutes in background, not before', () => {
    expect(shouldPlay(0, RESUME_AFTER_MS - 1)).toBe(false);
    expect(shouldPlay(0, RESUME_AFTER_MS)).toBe(true);
  });

  it('treats corrupted storage as cold start', () => {
    sessionStorage.setItem('h4ck3d:splash:lastActive', 'garbage');
    expect(readLastActive()).toBeNull();
  });
});
