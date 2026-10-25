import confetti from 'canvas-confetti';

export type ConfettiApi = { fire: () => void; reset: () => void };

export const confettiApi: ConfettiApi = {
  fire() {
    const base = { disableForReducedMotion: true, colors: ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'] };
    void confetti({ ...base, particleCount: 120, spread: 80, origin: { y: 0.6 } });
    void confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    void confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
  },
  reset() {
    confetti.reset();
  },
};
