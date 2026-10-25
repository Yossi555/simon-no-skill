import { COLORS, type GameColor } from '../game/colors';

type Props = {
  litColor: GameColor | null;
  disabled: boolean;
  paused?: boolean;
  onPress: (color: GameColor) => void;
  onKeyPress: (color: GameColor) => void;
};

export function Board({ litColor, disabled, paused = false, onPress, onKeyPress }: Props) {
  return (
    <div className={paused ? 'board board--paused' : 'board'}>
      {COLORS.map((c) => {
        const state = litColor === null ? '' : litColor === c.id ? ' quadrant--lit' : ' quadrant--dim';
        return (
          <button
            key={c.id}
            type="button"
            className={`quadrant quadrant--${c.id}${state}`}
            style={{ gridArea: c.gridArea }}
            aria-label={c.label}
            disabled={disabled}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              onPress(c.id);
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                e.preventDefault();
                onKeyPress(c.id);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
        );
      })}
      <div className="board__center" aria-hidden="true" />
    </div>
  );
}
