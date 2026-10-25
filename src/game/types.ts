import type { GameColor } from './colors';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'paused' | 'won' | 'lost';

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
  /** השהיה (אודות / הסתרה): הקלט החלקי נזרק, הצגה מיושנת מתבטלת */
  | { type: 'pause' }
  /** "המשך משחק": הצגה מחדש של כל הרצף של אותו שלב */
  | { type: 'resume' };
