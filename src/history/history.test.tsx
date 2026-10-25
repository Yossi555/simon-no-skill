import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../App';
import type { AudioEngine } from '../audio/audioEngine';
import { COLORS, type GameColor } from '../game/colors';
import type { GameDeps } from '../game/useGame';
import { HISTORY_KEY, type GetStorage } from './historyStorage';

const QUEUE: GameColor[] = ['green', 'red', 'blue', 'yellow', 'green', 'green', 'red', 'blue', 'yellow', 'red'];
const LABEL = Object.fromEntries(COLORS.map((c) => [c.id, c.label])) as Record<GameColor, string>;
const presentMs = (n: number) => 1000 + n * 600 + (n - 1) * 250;

/** Storage בזיכרון שנשמר בין mount-ים (כמו localStorage אחרי Refresh), עם אפשרות להכשיל פעולות */
function memoryStorage() {
  const map = new Map<string, string>();
  const fail = { get: false, set: false, remove: false };
  const storage = {
    getItem: vi.fn((k: string) => {
      if (fail.get) throw new Error('blocked');
      return map.get(k) ?? null;
    }),
    setItem: vi.fn((k: string, v: string) => {
      if (fail.set) throw new Error('quota');
      map.set(k, v);
    }),
    removeItem: vi.fn((k: string) => {
      if (fail.remove) throw new Error('blocked');
      map.delete(k);
    }),
  };
  const getStorage: GetStorage = () => storage as unknown as Storage;
  const stored = () => (map.has(HISTORY_KEY) ? JSON.parse(map.get(HISTORY_KEY)!).results : []);
  return { storage, map, fail, getStorage, stored };
}

let engine: AudioEngine & { startTone: ReturnType<typeof vi.fn> };

function setup(opts: { getStorage?: GetStorage; strict?: boolean } = {}) {
  const queue = [...QUEUE];
  engine = {
    unlock: vi.fn(async () => true),
    startTone: vi.fn((_color: GameColor) => vi.fn()),
    playWin: vi.fn(),
    playLoss: vi.fn(),
    stopAll: vi.fn(),
  } satisfies AudioEngine;
  const confetti = { fire: vi.fn(), reset: vi.fn() };
  const gameDeps: Partial<GameDeps> = { engine, confetti, randomColor: () => queue.shift() ?? 'red' };
  const ui = <App gameDeps={gameDeps} getStorage={opts.getStorage} />;
  render(opts.strict ? <StrictMode>{ui}</StrictMode> : ui);
  return { engine };
}

const advance = async (ms: number) => {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      vi.advanceTimersByTime(Math.min(50, left));
    });
  }
};
const tap = (color: GameColor) => {
  fireEvent.pointerDown(screen.getByRole('button', { name: LABEL[color] }), { pointerType: 'touch' });
  fireEvent.pointerUp(window);
};
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};
const nav = (name: 'בית' | 'אודות') => fireEvent.click(screen.getByRole('button', { name }));
const cards = () => Array.from(document.querySelectorAll('.history-card'));

async function playTo(n: number) {
  await click('התחל משחק');
  await advance(presentMs(1));
  for (let r = 1; r < n; r++) {
    for (let i = 0; i < r; i++) tap(QUEUE[i]);
    await advance(1000 + presentMs(r + 1));
  }
}

/** הפסד בשלב 1 (או בשלב 2 במשחק הראשון), הצגת ההודעה ו"אישור" – חזרה ל-idle */
async function loseAt(n: 1 | 2) {
  await playTo(n);
  const presented = engine.startTone.mock.calls.at(-1)![0] as GameColor; // הצבע האחרון ברצף
  tap(presented === 'red' ? 'blue' : 'red');
  await advance(1000);
  await click('אישור');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 25, 18, 30));
});
afterEach(() => vi.useRealTimers());

describe('היסטוריית משחקים', () => {
  it('הפסד בשלב 1 – רשומה אחת: הפסד, 0 שלבים, זמן סיום', async () => {
    setup();
    await playTo(1);
    tap('red');
    await advance(1000);
    await click('אישור');
    nav('אודות');
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent('הפסד');
    expect(cards()[0]).toHaveTextContent('הושלמו 0 שלבים');
    const time = cards()[0].querySelector('time')!;
    expect(new Date(time.dateTime).getTime()).toBe(new Date(2026, 9, 25, 18, 30, 0).getTime() + presentMs(1));
    expect(time.textContent).toMatch(/18:30/);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!).results).toHaveLength(1);
  });

  it('ניצחון אחרי שלב 10 – רשומה אחת: ניצחון, 10 שלבים', async () => {
    const s = memoryStorage();
    setup({ getStorage: s.getStorage });
    await playTo(10);
    for (let i = 0; i < 10; i++) tap(QUEUE[i]);
    expect(s.stored()).toEqual([expect.objectContaining({ outcome: 'win', completedRounds: 10 })]);
    await advance(1000);
    await click('אישור');
    nav('אודות');
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent('ניצחון');
    expect(cards()[0]).toHaveTextContent('הושלמו 10 שלבים');
  });

  it('התוצאה נרשמת מיד – מעבר ל"אודות" לפני הודעת ההפסד כבר מציג אותה; "אישור" לא מוסיף', async () => {
    const s = memoryStorage();
    setup({ getStorage: s.getStorage });
    await playTo(3);
    tap('red'); // הרצף מתחיל ב-green
    nav('אודות');
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent('הושלמו 2 שלבים');
    nav('בית');
    await advance(1000);
    await click('אישור');
    await advance(5000);
    expect(s.stored()).toHaveLength(1);
    expect(s.storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('השהיה, מעבר מסכים, הסתרה ו-Refresh באמצע משחק אינם מוסיפים רשומה', async () => {
    const s = memoryStorage();
    const prior = { id: 'old', finishedAt: '2026-10-01T10:00:00.000Z', completedRounds: 3, outcome: 'loss' };
    s.map.set(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: [prior] })); // היסטוריה קודמת
    setup({ getStorage: s.getStorage });
    await playTo(2);
    nav('אודות');
    nav('בית');
    await click('המשך משחק');
    await advance(presentMs(2));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await click('המשך משחק');
    await advance(presentMs(2));
    expect(s.stored()).toHaveLength(1);
    cleanup(); // Refresh באמצע משחק
    setup({ getStorage: s.getStorage });
    nav('אודות');
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent('הושלמו 3 שלבים');
    expect(s.storage.setItem).not.toHaveBeenCalled();
  });

  it('אחרי 11 משחקים – 10 רשומות מהחדש לישן, ונשמרות אחרי Refresh', async () => {
    const s = memoryStorage();
    setup({ getStorage: s.getStorage });
    await loseAt(2); // המשחק הראשון והישן ביותר: שלב אחד הושלם
    for (let i = 0; i < 10; i++) await loseAt(1);
    nav('אודות');
    expect(cards()).toHaveLength(10);
    expect(cards().every((c) => c.textContent!.includes('הושלמו 0 שלבים'))).toBe(true);
    const times = cards().map((c) => Date.parse(c.querySelector('time')!.dateTime));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    cleanup();
    setup({ getStorage: s.getStorage });
    nav('אודות');
    expect(cards()).toHaveLength(10);
    expect(cards().map((c) => c.querySelector('time')!.dateTime)).toEqual(
      s.stored().map((r: { finishedAt: string }) => r.finishedAt),
    );
  });

  it('"מחק היסטוריה": מוצג רק כשיש רשומות; "ביטול" לא משנה, "מחק" מרוקן', async () => {
    const s = memoryStorage();
    setup({ getStorage: s.getStorage });
    nav('אודות');
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    nav('בית');
    await loseAt(1);
    await loseAt(1);
    nav('אודות');

    await click('מחק היסטוריה');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('למחוק את ההיסטוריה?');
    await click('ביטול');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    expect(s.stored()).toHaveLength(2);
    expect(s.storage.removeItem).not.toHaveBeenCalled();

    await click('מחק היסטוריה');
    await click('מחק');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(0);
    expect(s.map.has(HISTORY_KEY)).toBe(false);
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
  });

  it('כשל שמירה – הודעה בהודעת הסיום, והמשחק הבא מתחיל כרגיל', async () => {
    const s = memoryStorage();
    s.fail.set = true;
    const { engine } = setup({ getStorage: s.getStorage });
    await playTo(1);
    tap('red');
    await advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('לא ניתן היה לשמור את התוצאה בהיסטוריה.');
    await click('אישור');
    engine.startTone.mockClear();
    await click('התחל משחק');
    await advance(presentMs(1));
    expect(engine.startTone).toHaveBeenCalledTimes(1);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    nav('אודות');
    expect(cards()).toHaveLength(0);
  });

  it('כשל קריאה – הודעה ב"אודות", והמשחק זמין', async () => {
    const s = memoryStorage();
    s.fail.get = true;
    setup({ getStorage: s.getStorage });
    nav('אודות');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן לטעון את היסטוריית המשחקים');
    nav('בית');
    await loseAt(1);
    expect(s.stored()).toHaveLength(1);
  });

  it('localStorage שעצם הגישה אליו זורקת – אין קריסה, והמשחק עובד', async () => {
    const blocked: GetStorage = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    setup({ getStorage: blocked });
    await playTo(1);
    tap('red');
    await advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('לא ניתן היה לשמור');
    await click('אישור');
    nav('אודות');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן לטעון');
  });

  it('כשל מחיקה – הודעה, והרשימה נשארת', async () => {
    const s = memoryStorage();
    setup({ getStorage: s.getStorage });
    await loseAt(1);
    s.fail.remove = true;
    nav('אודות');
    await click('מחק היסטוריה');
    await click('מחק');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן היה למחוק את ההיסטוריה');
    expect(cards()).toHaveLength(1);
    expect(s.stored()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'מחק היסטוריה' })).toBeInTheDocument();
  });

  it('Strict Mode: כל משחק שהסתיים נרשם פעם אחת בלבד', async () => {
    const s = memoryStorage();
    setup({ getStorage: s.getStorage, strict: true });
    await loseAt(1);
    expect(s.stored()).toHaveLength(1);
    expect(s.storage.setItem).toHaveBeenCalledTimes(1);
    await loseAt(1);
    await advance(5000);
    expect(s.stored()).toHaveLength(2);
    expect(s.storage.setItem).toHaveBeenCalledTimes(2);
    nav('אודות');
    expect(cards()).toHaveLength(2);
  });
});
