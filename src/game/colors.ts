export type GameColor = 'green' | 'red' | 'yellow' | 'blue';

export type ColorDef = {
  id: GameColor;
  label: string;
  /** מיקום מרחבי בגריד 2×2 (לא מתהפך ב-RTL) */
  gridArea: string;
};

export const COLORS: readonly ColorDef[] = [
  { id: 'green', label: 'ירוק', gridArea: '1 / 1' },
  { id: 'red', label: 'אדום', gridArea: '1 / 2' },
  { id: 'yellow', label: 'צהוב', gridArea: '2 / 1' },
  { id: 'blue', label: 'כחול', gridArea: '2 / 2' },
];
