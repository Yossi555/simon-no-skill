import { COLORS, type GameColor } from './colors';

/** רנדום למשחק בלבד – אינו קריפטוגרפי. מוחלף בבדיקות. */
export function randomColor(): GameColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
