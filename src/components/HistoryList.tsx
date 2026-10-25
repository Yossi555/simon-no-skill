import type { GameResult } from '../history/historyStorage';

const dateFormat = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });

export const roundsText = (n: number) => (n === 1 ? 'הושלם שלב אחד' : `הושלמו ${n} שלבים`);

type Props = { results: GameResult[] };

export function HistoryList({ results }: Props) {
  return (
    <ol className="history">
      {results.map((r) => (
        <li key={r.id} className="card history-card">
          <div className="history-card__main">
            <span className={`history-card__outcome history-card__outcome--${r.outcome}`}>
              {r.outcome === 'win' ? 'ניצחון' : 'הפסד'}
            </span>
            <span>{roundsText(r.completedRounds)}</span>
          </div>
          <time className="history-card__date" dateTime={r.finishedAt}>
            <bdi>{dateFormat.format(new Date(r.finishedAt))}</bdi>
          </time>
        </li>
      ))}
    </ol>
  );
}
