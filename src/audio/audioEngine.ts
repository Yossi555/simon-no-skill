import type { GameColor } from '../game/colors';

export type AudioEngine = {
  /** יוצר/מחדש AudioContext. לקרוא רק מתוך Gesture. false = כשל */
  unlock(): Promise<boolean>;
  /** מתחיל צליל צבע; מחזיר פונקציית עצירה */
  startTone(color: GameColor): () => void;
  playWin(): void;
  playLoss(): void;
  stopAll(): void;
};

export const TONE_HZ: Record<GameColor, number> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
};

const WIN_NOTES = [523, 659, 784, 1047];
const LOSS_NOTES = [233, 196, 156];
const ATTACK = 0.015;
const RELEASE = 0.03;
const GAIN = 0.25;

type AudioContextCtor = typeof AudioContext;

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  const active = new Set<{ stop: () => void }>();

  function tone(freq: number, type: OscillatorType, startAt: number, duration: number | null) {
    const c = ctx!;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(GAIN, startAt + ATTACK);
    osc.connect(gain).connect(c.destination);
    osc.start(startAt);
    let ended = false;
    const handle = {
      stop: () => {
        if (ended) return;
        ended = true;
        active.delete(handle);
        const t = Math.max(c.currentTime, startAt);
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + RELEASE);
        osc.stop(t + RELEASE);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      },
    };
    active.add(handle);
    if (duration !== null) {
      gain.gain.setValueAtTime(GAIN, startAt + duration - RELEASE);
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      osc.stop(startAt + duration);
      osc.onended = () => {
        active.delete(handle);
        osc.disconnect();
        gain.disconnect();
      };
    }
    return handle;
  }

  function motif(notes: number[], type: OscillatorType, step: number) {
    if (!ctx) return;
    const now = ctx.currentTime;
    notes.forEach((f, i) => tone(f, type, now + i * step, step * 0.95));
  }

  return {
    async unlock() {
      try {
        if (!ctx) {
          const Ctor: AudioContextCtor | undefined =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
          if (!Ctor) return false;
          ctx = new Ctor();
        }
        if (ctx.state !== 'running') await ctx.resume();
        return (ctx.state as string) === 'running';
      } catch {
        return false;
      }
    },
    startTone(color) {
      if (!ctx) return () => {};
      return tone(TONE_HZ[color], 'triangle', ctx.currentTime, null).stop;
    },
    playWin() {
      motif(WIN_NOTES, 'sine', 0.16);
    },
    playLoss() {
      motif(LOSS_NOTES, 'sawtooth', 0.28);
    },
    stopAll() {
      [...active].forEach((h) => h.stop());
    },
  };
}
