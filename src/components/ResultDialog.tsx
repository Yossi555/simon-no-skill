import { roundsText } from './HistoryList';

type Props = { won: boolean; completedRounds: number; saveError: boolean; onConfirm: () => void };

export function ResultDialog({ won, completedRounds, saveError, onConfirm }: Props) {
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{won ? 'כל הכבוד! ניצחת!' : 'נפסלת!'}</h2>
        <p>{roundsText(completedRounds)}</p>
        {saveError && (
          <p className="dialog__error" role="alert">
            לא ניתן היה לשמור את התוצאה בהיסטוריה.
          </p>
        )}
        <button type="button" className="btn btn--primary" onClick={onConfirm} autoFocus>
          אישור
        </button>
      </div>
    </div>
  );
}
