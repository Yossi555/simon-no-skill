import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createAudioEngine, type AudioEngine } from '../audio/audioEngine';
import type { GameColor } from './colors';
import { confettiApi, type ConfettiApi } from './confetti';
import { randomColor as defaultRandomColor } from './random';
import { gameReducer, initialGameState } from './reducer';
import { playSequence } from './sequence';
import { PRESS_MIN_MS, RESULT_DELAY_MS, ROUND_DONE_MS } from './timing';

export type GameDeps = {
  engine: AudioEngine;
  randomColor: () => GameColor;
  confetti: ConfettiApi;
};

type Hold = {
  stop: () => void;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
};

export function useGame(deps?: Partial<GameDeps>) {
  const [engine] = useState(() => deps?.engine ?? createAudioEngine());
  const randomColor = deps?.randomColor ?? defaultRandomColor;
  const confetti = deps?.confetti ?? confettiApi;

  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [litColor, setLit] = useState<GameColor | null>(null);
  const [audioError, setAudioError] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const starting = useRef(false);
  const hold = useRef<Hold | null>(null);

  const endHold = useCallback(() => {
    const h = hold.current;
    if (!h) return;
    if (h.timer) clearTimeout(h.timer);
    h.stop();
    hold.current = null;
    setLit(null);
  }, []);

  // הצגת רצף / המתנה למעבר שלב
  useEffect(() => {
    if (state.status !== 'presenting') return;
    const { presentationId } = state;
    if (state.completedRounds === state.round) {
      const t = setTimeout(() => dispatch({ type: 'showNextRound', presentationId }), ROUND_DONE_MS);
      return () => clearTimeout(t);
    }
    return playSequence(state.sequence, {
      engine,
      setLit,
      onDone: () => dispatch({ type: 'presentationDone', presentationId }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.presentationId, state.round]);

  // הודעת סיום, צליל סיום וקונפטי – שנייה אחרי הלחיצה האחרונה
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    const { gameId, status } = state;
    const t = setTimeout(() => {
      dispatch({ type: 'revealResult', gameId });
      if (status === 'won') {
        engine.playWin();
        confetti.fire();
      } else {
        engine.playLoss();
      }
    }, RESULT_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.gameId]);

  // שחרור האצבע נקלט גם מחוץ לרבע (הוא עלול להפוך ל-disabled)
  const release = useCallback(() => {
    const h = hold.current;
    if (!h || h.timer) return;
    const remaining = Math.max(0, PRESS_MIN_MS - (Date.now() - h.startedAt));
    h.timer = setTimeout(endHold, remaining);
  }, [endHold]);

  useEffect(() => {
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      endHold();
      engine.stopAll();
    };
  }, [release, endHold, engine]);

  const start = useCallback(async () => {
    if (stateRef.current.status !== 'idle' || starting.current) return;
    starting.current = true;
    setAudioError(false);
    const ok = await engine.unlock();
    starting.current = false;
    if (!ok) {
      setAudioError(true);
      return;
    }
    dispatch({ type: 'start', firstColor: randomColor() });
  }, [engine, randomColor]);

  const press = useCallback(
    (color: GameColor) => {
      if (stateRef.current.status !== 'awaitingInput') return;
      endHold();
      hold.current = { stop: engine.startTone(color), startedAt: Date.now(), timer: null };
      setLit(color);
      const s = stateRef.current;
      const isLast = s.inputIndex + 1 === s.sequence.length && color === s.sequence[s.inputIndex];
      dispatch({ type: 'press', color, nextColor: isLast ? randomColor() : color });
    },
    [engine, endHold, randomColor],
  );

  /** לחיצה ממקלדת: הארה וצליל של 300ms */
  const pressAndRelease = useCallback(
    (color: GameColor) => {
      press(color);
      release();
    },
    [press, release],
  );

  const dismiss = useCallback(() => {
    confetti.reset();
    dispatch({ type: 'dismiss' });
  }, [confetti]);

  /** פתרון זמני (M2): מעבר ל"אודות" באמצע משחק מבטל אותו */
  const abandon = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'idle' || s.resultShown) return;
    endHold();
    engine.stopAll();
    setLit(null);
    confetti.reset();
    dispatch({ type: 'abandon' });
  }, [endHold, engine, confetti]);

  return { state, litColor, audioError, start, press, pressAndRelease, release, dismiss, abandon };
}
