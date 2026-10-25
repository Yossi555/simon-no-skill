type Props = { won: boolean; completedRounds: number; onConfirm: () => void };

export function ResultDialog({ won, completedRounds, onConfirm }: Props) {
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{won ? 'כל הכבוד! ניצחת!' : 'נפסלת!'}</h2>
        <p>{completedRounds === 1 ? 'הושלם שלב אחד' : `הושלמו ${completedRounds} שלבים`}</p>
        <button type="button" className="btn btn--primary" onClick={onConfirm} autoFocus>
          אישור
        </button>
      </div>
    </div>
  );
}
