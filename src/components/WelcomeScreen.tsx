import { useEffect, useState } from 'react';
import { FADE_MS, HOLD_MS, SPLASH_SRC, type WelcomePhase } from '../hooks/useWelcomeScreen';

const NICK = 'H4CK3D';
const GLYPHS = '01<>/\\#$%&*+=?ABCDEFHKX';
const STEP_MS = 55;

/**
 * Micro-animation: the nick "decodes" from random glyphs letter by letter,
 * then the "--" brackets settle in and a cursor blinks. Static with reduced motion.
 */
function useDecodedText(text: string, active: boolean) {
  const [out, setOut] = useState(active ? '' : text);
  useEffect(() => {
    if (!active) {
      setOut(text);
      return;
    }
    let frame = 0;
    const id = window.setInterval(() => {
      frame++;
      const locked = Math.floor(frame / 3);
      const next = text
        .split('')
        .map((ch, i) => (i < locked ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');
      setOut(next);
      if (locked >= text.length) window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [text, active]);
  return out;
}

interface WelcomeScreenProps {
  phase: WelcomePhase;
}

export function WelcomeScreen({ phase }: WelcomeScreenProps) {
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const decoding = phase !== 'loading' && !reduced;
  const nick = useDecodedText(NICK, decoding);
  const settled = nick === NICK && phase !== 'loading';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Načítavam H4CK3D Project Timeline"
      className="fixed inset-0 z-[70] h-[100dvh] w-full touch-none select-none overflow-hidden overscroll-none bg-app lg:hidden"
      style={{
        opacity: phase === 'fading' ? 0 : 1,
        transition: reduced ? 'none' : `opacity ${FADE_MS}ms ease-out`,
      }}
      onPointerDown={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* Static background — no parallax, no zoom, no motion. */}
      <img
        src={SPLASH_SRC}
        alt=""
        aria-hidden
        draggable={false}
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
        <p className="font-mono text-3xl font-medium tracking-wide text-primary">
          <span
            className="inline-block text-muted transition-[opacity,transform] duration-300 ease-out"
            style={{ opacity: settled ? 1 : 0, transform: settled ? 'none' : 'translateX(-6px)' }}
          >
            --
          </span>
          <span className="tabular-nums">{nick || ' '.repeat(NICK.length)}</span>
          <span
            className="inline-block text-muted transition-[opacity,transform] duration-300 ease-out"
            style={{ opacity: settled ? 1 : 0, transform: settled ? 'none' : 'translateX(6px)' }}
          >
            --
          </span>
          <span
            className={`ml-1 inline-block h-[0.9em] w-[0.5ch] translate-y-[0.12em] bg-primary ${
              settled && !reduced ? 'animate-[splash-blink_1s_steps(1)_infinite]' : ''
            }`}
            style={{ opacity: settled ? undefined : 0 }}
          />
        </p>
        <p className="text-sm text-muted">Project Timeline</p>
      </div>

      <div
        aria-hidden
        className="absolute left-1/2 h-[2px] w-[40%] max-w-[200px] -translate-x-1/2 overflow-hidden rounded-full bg-border"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 48px)' }}
      >
        <div
          className="h-full w-full origin-left bg-primary"
          style={{
            transform: phase === 'loading' ? 'scaleX(0)' : 'scaleX(1)',
            transition: phase === 'loading' ? 'none' : `transform ${HOLD_MS}ms linear`,
          }}
        />
      </div>
    </div>
  );
}
