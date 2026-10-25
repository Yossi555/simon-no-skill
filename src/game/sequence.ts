import type { GameColor } from './colors';
import type { AudioEngine } from '../audio/audioEngine';
import { GAP_MS, LIGHT_MS, START_DELAY_MS } from './timing';

type Options = {
  engine: AudioEngine;
  setLit: (color: GameColor | null) => void;
  onDone: () => void;
};

/**
 * Sequence Controller: מציג את הרצף בקצב קבוע. כל ה-Timers נקבעים מראש,
 * ולכן ביטול אחד מנקה הכול מיד (כולל הארה וצליל פעילים).
 */
export function playSequence(sequence: readonly GameColor[], { engine, setLit, onDone }: Options) {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let stopTone: (() => void) | null = null;
  let cancelled = false;

  const at = (ms: number, fn: () => void) => {
    timers.push(
      setTimeout(() => {
        if (!cancelled) fn();
      }, ms),
    );
  };

  let t = START_DELAY_MS;
  sequence.forEach((color) => {
    at(t, () => {
      setLit(color);
      stopTone = engine.startTone(color);
    });
    at(t + LIGHT_MS, () => {
      stopTone?.();
      stopTone = null;
      setLit(null);
    });
    t += LIGHT_MS + GAP_MS;
  });
  at(t - GAP_MS, onDone);

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    stopTone?.();
    stopTone = null;
    setLit(null);
  };
}
