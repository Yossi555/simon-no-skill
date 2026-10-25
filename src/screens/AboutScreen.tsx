import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HistoryList } from '../components/HistoryList';
import type { History } from '../history/useHistory';

type Props = { history: History };

export function AboutScreen({ history }: Props) {
  const { results, loadError, deleteError, clear } = history;
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="screen about">
      <header className="screen__header">
        <h1>אודות</h1>
      </header>
      <div className="card">
        <h2>על המשחק</h2>
        <ul className="about__rules">
          <li>זכרו את רצף הצבעים שמוצג.</li>
          <li>לחצו על הצבעים באותו סדר.</li>
          <li>בכל שלב מתווסף צבע אחד לרצף.</li>
          <li>טעות אחת מסיימת את המשחק.</li>
          <li>שחזור נכון של 10 שלבים מזכה בניצחון.</li>
        </ul>
      </div>
      <h2 className="about__history-title">10 המשחקים האחרונים</h2>
      {loadError && (
        <p className="about__error" role="alert">
          לא ניתן לטעון את היסטוריית המשחקים. המשחק עצמו זמין כרגיל.
        </p>
      )}
      {deleteError && (
        <p className="about__error" role="alert">
          לא ניתן היה למחוק את ההיסטוריה. נסו שוב.
        </p>
      )}
      {results.length > 0 ? (
        <>
          <HistoryList results={results} />
          <button type="button" className="btn btn--secondary" onClick={() => setConfirming(true)}>
            מחק היסטוריה
          </button>
        </>
      ) : (
        !loadError && <p className="card card--empty">עדיין אין משחקים שמורים.</p>
      )}
      {confirming && (
        <ConfirmDialog
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            clear();
            setConfirming(false);
          }}
        />
      )}
    </section>
  );
}
