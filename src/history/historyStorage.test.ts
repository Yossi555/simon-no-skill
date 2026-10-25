import {
  clearHistory,
  createResult,
  HISTORY_KEY,
  loadHistory,
  saveResult,
  type GameResult,
} from './historyStorage';

/** Storage בזיכרון, שאפשר להכשיל כל פעולה בו */
function memoryStorage(fail: { get?: boolean; set?: boolean; remove?: boolean } = {}) {
  const map = new Map<string, string>();
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
  return { storage, map, get: () => storage as unknown as Storage };
}

const result = (n: number, outcome: GameResult['outcome'] = 'loss'): GameResult =>
  createResult(outcome, n % 11, new Date(2026, 9, 1, 12, n));

describe('historyStorage', () => {
  it('מפתח חסר – רשימה ריקה ללא שגיאה', () => {
    expect(loadHistory(memoryStorage().get)).toEqual({ results: [], error: false });
  });

  it('שומר וקורא חזרה, החדש בראש הרשימה', () => {
    const s = memoryStorage();
    let list: GameResult[] = [];
    list = saveResult(s.get, list, result(1)).results;
    list = saveResult(s.get, list, result(2, 'win')).results;
    const loaded = loadHistory(s.get);
    expect(loaded.error).toBe(false);
    expect(loaded.results).toEqual(list);
    expect(loaded.results.map((r) => r.completedRounds)).toEqual([2, 1]);
    expect(JSON.parse(s.map.get(HISTORY_KEY)!).schemaVersion).toBe(1);
  });

  it('אחרי 11 הוספות נשארות 10 רשומות מהחדש לישן, והישנה ביותר הוסרה', () => {
    const s = memoryStorage();
    const all = Array.from({ length: 11 }, (_, i) => result(i));
    let list: GameResult[] = [];
    for (const r of all) list = saveResult(s.get, list, r).results;
    const { results } = loadHistory(s.get);
    expect(results).toHaveLength(10);
    expect(results.map((r) => r.id)).toEqual(all.slice(1).reverse().map((r) => r.id));
    expect(results.some((r) => r.id === all[0].id)).toBe(false);
  });

  it('JSON פגום או גרסה אחרת – שגיאה, והשמירה הבאה כותבת רשימה תקינה', () => {
    const s = memoryStorage();
    s.map.set(HISTORY_KEY, '{not json');
    expect(loadHistory(s.get)).toEqual({ results: [], error: true });
    s.map.set(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }));
    expect(loadHistory(s.get).error).toBe(true);
    s.map.set(HISTORY_KEY, 'null');
    expect(loadHistory(s.get).error).toBe(true);

    const r = result(3);
    expect(saveResult(s.get, [], r).ok).toBe(true);
    expect(loadHistory(s.get)).toEqual({ results: [r], error: false });
  });

  it('מסנן רשומות לא תקינות', () => {
    const s = memoryStorage();
    const good = result(4);
    const bad = [
      { ...good, id: 5 },
      { ...good, finishedAt: 'אתמול' },
      { ...good, completedRounds: 11 },
      { ...good, completedRounds: 2.5 },
      { ...good, outcome: 'won' },
      null,
    ];
    s.map.set(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: [bad[0], good, ...bad.slice(1)] }));
    expect(loadHistory(s.get)).toEqual({ results: [good], error: false });
  });

  it('כשל קריאה, כתיבה או מחיקה – ללא קריסה, ומדווח ככשל', () => {
    const existing = [result(1)];
    expect(loadHistory(memoryStorage({ get: true }).get)).toEqual({ results: [], error: true });
    expect(saveResult(memoryStorage({ set: true }).get, existing, result(2))).toEqual({
      results: existing,
      ok: false,
    });
    expect(clearHistory(memoryStorage({ remove: true }).get)).toBe(false);

    const throwing = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    expect(loadHistory(throwing).error).toBe(true);
    expect(saveResult(throwing, existing, result(2)).ok).toBe(false);
    expect(clearHistory(throwing)).toBe(false);
  });

  it('מחיקה מסירה את המפתח', () => {
    const s = memoryStorage();
    saveResult(s.get, [], result(1));
    expect(clearHistory(s.get)).toBe(true);
    expect(s.map.has(HISTORY_KEY)).toBe(false);
    expect(loadHistory(s.get)).toEqual({ results: [], error: false });
  });

  it('createResult – תאריך ISO ומזהה שונה לשתי רשומות באותה מילישנייה', () => {
    const now = new Date(2026, 9, 25, 18, 30);
    const a = createResult('win', 10, now);
    const b = createResult('win', 10, now);
    expect(a.finishedAt).toBe(now.toISOString());
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ outcome: 'win', completedRounds: 10 });
  });
});
