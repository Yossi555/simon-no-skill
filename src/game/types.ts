import type { GameColor } from './colors';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

export type GameState = {
  status: GameStatus;
  sequence: GameColor[];
  round: number;
  inputIndex: number;
  completedRounds: number;
  gameId: number;
  presentationId: number;
  /** הודעת הסיום מוצגת (מתעכבת שנייה אחרי הלחיצה האחרונה) */
  resultShown: boolean;
};

export type GameAction =
  | { type: 'start'; firstColor: GameColor }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: GameColor; nextColor: GameColor }
  | { type: 'showNextRound'; presentationId: number }
  | { type: 'revealResult'; gameId: number }
  | { type: 'dismiss' }
  /** פתרון זמני של Milestone 2 – מוחלף ב-pause ב-Milestone 3 */
  | { type: 'abandon' };
