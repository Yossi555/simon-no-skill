import { MAX_ROUNDS } from './timing';
import type { GameAction, GameState } from './types';

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
  resultShown: false,
};

/** בין סיום שלב להצגת מספר השלב הבא: completedRounds === round */
const isRoundPending = (s: GameState) => s.completedRounds === s.round;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        status: 'presenting',
        sequence: [action.firstColor],
        round: 1,
        inputIndex: 0,
        completedRounds: 0,
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
        resultShown: false,
      };

    case 'presentationDone':
      if (
        state.status !== 'presenting' ||
        action.presentationId !== state.presentationId ||
        isRoundPending(state)
      ) {
        return state;
      }
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost', completedRounds: state.round - 1, resultShown: false };
      }
      if (state.inputIndex + 1 < state.sequence.length) {
        return { ...state, inputIndex: state.inputIndex + 1 };
      }
      if (state.round >= MAX_ROUNDS) {
        return { ...state, status: 'won', completedRounds: MAX_ROUNDS, resultShown: false };
      }
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        completedRounds: state.round,
        inputIndex: 0,
        presentationId: state.presentationId + 1,
      };
    }

    case 'showNextRound':
      if (
        state.status !== 'presenting' ||
        action.presentationId !== state.presentationId ||
        !isRoundPending(state) ||
        state.round >= MAX_ROUNDS
      ) {
        return state;
      }
      return { ...state, round: state.round + 1 };

    case 'revealResult':
      if (
        (state.status !== 'won' && state.status !== 'lost') ||
        action.gameId !== state.gameId ||
        state.resultShown
      ) {
        return state;
      }
      return { ...state, resultShown: true };

    case 'dismiss':
      if ((state.status !== 'won' && state.status !== 'lost') || !state.resultShown) return state;
      return { ...initialGameState, gameId: state.gameId, presentationId: state.presentationId };

    case 'abandon':
      if (state.status === 'idle' || state.resultShown) return state;
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId + 1,
      };
  }
}
