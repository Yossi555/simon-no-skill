type Props = { onCancel: () => void; onConfirm: () => void };

/** אישור מחיקת היסטוריה – שכבה בתוך מסך אודות (DESIGN §1.3) */
export function ConfirmDialog({ onCancel, onConfirm }: Props) {
  return (
    <div className="overlay overlay--fixed">
      <div
        className="dialog dialog--light"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h2 id="confirm-title">למחוק את ההיסטוריה?</h2>
        <p id="confirm-desc">כל התוצאות השמורות יימחקו, ולא ניתן לשחזר אותן.</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} autoFocus>
            ביטול
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            מחק
          </button>
        </div>
      </div>
    </div>
  );
}
