/** History Repository – קריאה, אימות וכתיבה של היסטוריית המשחקים ב-localStorage (ADR-4) */

export type Outcome = 'win' | 'loss';

export type GameResult = {
  id: string;
  /** ISO 8601, כולל זמן מלא */
  finishedAt: string;
  /** מספר שלבים שהושלמו: 0–10 */
  completedRounds: number;
  outcome: Outcome;
};

type HistoryData = {
  schemaVersion: 1;
  /** לכל היותר 10, מהחדש לישן */
  results: GameResult[];
};

export type GetStorage = () => Storage;

export const HISTORY_KEY = 'simon.history.v1';
export const HISTORY_LIMIT = 10;

export const defaultGetStorage: GetStorage = () => window.localStorage;

function isResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= 10 &&
    (r.outcome === 'win' || r.outcome === 'loss')
  );
}

/** מפתח חסר → רשימה ריקה; אחסון לא זמין או נתונים שלא ניתן לקרוא → רשימה ריקה + error */
export function loadHistory(getStorage: GetStorage): { results: GameResult[]; error: boolean } {
  let raw: string | null;
  try {
    raw = getStorage().getItem(HISTORY_KEY);
  } catch {
    return { results: [], error: true };
  }
  if (raw === null) return { results: [], error: false };
  try {
    const data = JSON.parse(raw) as Partial<HistoryData> | null;
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.results)) {
      return { results: [], error: true };
    }
    // רשומות לא תקינות מסוננות בשקט
    return { results: data.results.filter(isResult).slice(0, HISTORY_LIMIT), error: false };
  } catch {
    return { results: [], error: true };
  }
}

/** הוספה בראש הרשימה ושמירת עשר בלבד; בכשל כתיבה הרשימה הקודמת חוזרת ללא שינוי */
export function saveResult(
  getStorage: GetStorage,
  current: GameResult[],
  result: GameResult,
): { results: GameResult[]; ok: boolean } {
  const results = [result, ...current].slice(0, HISTORY_LIMIT);
  const data: HistoryData = { schemaVersion: 1, results };
  try {
    getStorage().setItem(HISTORY_KEY, JSON.stringify(data));
    return { results, ok: true };
  } catch {
    return { results: current, ok: false };
  }
}

export function clearHistory(getStorage: GetStorage): boolean {
  try {
    getStorage().removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

/** מזהה מזמן ומספר אקראי – crypto.randomUUID אינו זמין ב-HTTP לא מאובטח (ADR-4) */
export function createResult(outcome: Outcome, completedRounds: number, now = new Date()): GameResult {
  const id = `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, finishedAt: now.toISOString(), completedRounds, outcome };
}
