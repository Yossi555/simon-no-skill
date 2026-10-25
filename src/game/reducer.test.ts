import { COLORS, type GameColor } from './colors';
import { gameReducer, initialGameState } from './reducer';
import type { GameAction, GameState } from './types';

const run = (actions: GameAction[], from: GameState = initialGameState) =>
  actions.reduce(gameReducer, from);

const started = (first: GameColor = 'green') => run([{ type: 'start', firstColor: first }]);
const listening = (s: GameState) =>
  gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId });

/** משחק עד שלב n מוכן לקלט, עם רצף שנקבע מראש */
function atRound(n: number, colors: GameColor[]): GameState {
  let s = listening(started(colors[0]));
  for (let r = 1; r < n; r++) {
    for (let i = 0; i < r; i++) {
      s = gameReducer(s, { type: 'press', color: s.sequence[i], nextColor: colors[r] });
    }
    s = gameReducer(s, { type: 'showNextRound', presentationId: s.presentationId });
    s = listening(s);
  }
  return s;
}

const SEQ: GameColor[] = ['green', 'red', 'green', 'blue', 'yellow', 'yellow', 'red', 'blue', 'green', 'red'];

describe('gameReducer', () => {
  it('מתחיל משחק עם רצף של צבע אחד', () => {
    const s = started('red');
    expect(s).toMatchObject({ status: 'presenting', sequence: ['red'], round: 1, completedRounds: 0 });
    expect(s.gameId).toBe(1);
  });

  it('אורכי הרצף בשלבים 1, 2 ו-10 הם 1, 2 ו-10, והרצף הקודם הוא prefix', () => {
    const lens: number[] = [];
    const seqs: GameColor[][] = [];
    for (let n = 1; n <= 10; n++) {
      const s = atRound(n, SEQ);
      lens.push(s.sequence.length);
      seqs.push(s.sequence);
      expect(s.round).toBe(n);
    }
    expect([lens[0], lens[1], lens[9]]).toEqual([1, 2, 10]);
    for (let n = 1; n < 10; n++) expect(seqs[n].slice(0, n)).toEqual(seqs[n - 1]);
  });

  it('מאפשר צבע חוזר ברצף', () => {
    expect(atRound(3, SEQ).sequence).toEqual(['green', 'red', 'green']);
  });

  it('לחיצה נכונה מקדמת את האינדקס בלבד', () => {
    const s = gameReducer(atRound(2, SEQ), { type: 'press', color: 'green', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'awaitingInput', inputIndex: 1 });
  });

  it('הפסד בשלב 1 – 0 שלבים הושלמו', () => {
    const s = gameReducer(atRound(1, SEQ), { type: 'press', color: 'red', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 0 });
  });

  it('הפסד בשלב 5 – 4 שלבים הושלמו', () => {
    const s = gameReducer(atRound(5, SEQ), { type: 'press', color: 'blue', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 4 });
  });

  it('הפסד באמצע שלב (אחרי לחיצות נכונות)', () => {
    let s = atRound(3, SEQ);
    s = gameReducer(s, { type: 'press', color: 'green', nextColor: 'blue' });
    s = gameReducer(s, { type: 'press', color: 'blue', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 2 });
  });

  it('סיום שלב חוסם קלט מיד ומעדכן completedRounds לפני מעבר השלב', () => {
    const s = gameReducer(atRound(1, SEQ), { type: 'press', color: 'green', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'presenting', round: 1, completedRounds: 1, sequence: ['green', 'red'] });
    const blocked = gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' });
    expect(blocked).toBe(s);
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId })).toBe(s);
    expect(gameReducer(s, { type: 'showNextRound', presentationId: s.presentationId })).toMatchObject({ round: 2 });
  });

  it('ניצחון לאחר שחזור שלב 10 ללא שלב 11', () => {
    let s = atRound(10, SEQ);
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'press', color: s.sequence[i], nextColor: 'red' });
    }
    expect(s).toMatchObject({ status: 'won', completedRounds: 10, round: 10 });
    expect(s.sequence).toHaveLength(10);
    expect(gameReducer(s, { type: 'showNextRound', presentationId: s.presentationId })).toBe(s);
  });

  it('מתעלם מ-Actions מיושנים או לא חוקיים', () => {
    const s = started();
    expect(gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' })).toBe(s);
    expect(gameReducer(s, { type: 'presentationDone', presentationId: 99 })).toBe(s);
    expect(gameReducer(s, { type: 'start', firstColor: 'red' })).toBe(s);
    expect(gameReducer(s, { type: 'dismiss' })).toBe(s);
    expect(gameReducer(initialGameState, { type: 'abandon' })).toBe(initialGameState);
    const lost = gameReducer(atRound(1, SEQ), { type: 'press', color: 'red', nextColor: 'red' });
    expect(gameReducer(lost, { type: 'revealResult', gameId: 99 })).toBe(lost);
    expect(gameReducer(lost, { type: 'dismiss' })).toBe(lost); // טרם הוצגה
  });

  it('dismiss חוזר ל-idle ושומר מזהים; משחק הבא מקבל gameId חדש', () => {
    let s = gameReducer(atRound(1, SEQ), { type: 'press', color: 'red', nextColor: 'red' });
    s = run([{ type: 'revealResult', gameId: s.gameId }, { type: 'dismiss' }], s);
    expect(s).toMatchObject({ ...initialGameState, gameId: 1, presentationId: 1 });
    const next = gameReducer(s, { type: 'start', firstColor: 'blue' });
    expect(next.gameId).toBe(2);
    expect(next.sequence).toEqual(['blue']);
  });

  it('abandon מחזיר ל-idle ומבטל הצגה', () => {
    const s = started();
    const a = gameReducer(s, { type: 'abandon' });
    expect(a.status).toBe('idle');
    expect(a.presentationId).toBe(s.presentationId + 1);
    expect(gameReducer(a, { type: 'presentationDone', presentationId: s.presentationId })).toBe(a);
  });

  it('קיימים ארבעה צבעים שונים', () => {
    expect(new Set(COLORS.map((c) => c.id)).size).toBe(4);
  });
});
