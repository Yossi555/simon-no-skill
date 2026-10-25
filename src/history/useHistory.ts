import { useCallback, useRef, useState } from 'react';
import {
  clearHistory,
  createResult,
  defaultGetStorage,
  loadHistory,
  saveResult,
  type GameResult,
  type GetStorage,
  type Outcome,
} from './historyStorage';

/** רשימת ההיסטוריה ומצבי הכשל (טעינה, שמירה, מחיקה) – מוחזק ב-App (ADR-4) */
export function useHistory(getStorage: GetStorage = defaultGetStorage) {
  const [initial] = useState(() => loadHistory(getStorage));
  const [results, setResults] = useState<GameResult[]>(initial.results);
  const [loadError, setLoadError] = useState(initial.error);
  const [saveError, setSaveError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const resultsRef = useRef(results);
  resultsRef.current = results;

  const record = useCallback(
    (outcome: Outcome, completedRounds: number) => {
      const saved = saveResult(getStorage, resultsRef.current, createResult(outcome, completedRounds));
      resultsRef.current = saved.results;
      setResults(saved.results);
      setSaveError(!saved.ok);
      if (saved.ok) setLoadError(false);
    },
    [getStorage],
  );

  const clear = useCallback(() => {
    const ok = clearHistory(getStorage);
    setDeleteError(!ok);
    if (ok) {
      resultsRef.current = [];
      setResults([]);
      setLoadError(false);
    }
    return ok;
  }, [getStorage]);

  return { results, loadError, saveError, deleteError, record, clear };
}

export type History = ReturnType<typeof useHistory>;
