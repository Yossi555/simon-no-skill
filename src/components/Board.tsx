import { COLORS } from '../game/colors';

export function Board() {
  return (
    <div className="board">
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`quadrant quadrant--${c.id}`}
          style={{ gridArea: c.gridArea }}
          aria-label={c.label}
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  );
}
