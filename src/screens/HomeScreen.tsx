import { Board } from '../components/Board';
import { ResultDialog } from '../components/ResultDialog';
import type { useGame } from '../game/useGame';

type Props = { game: ReturnType<typeof useGame> };

export function HomeScreen({ game }: Props) {
  const { state, litColor, audioError, start, resume, press, pressAndRelease, dismiss } = game;
  const { status } = state;

  return (
    <section className="screen home">
      <header className="screen__header">
        <h1>דיסקו גו</h1>
      </header>
      <h2 className="home__round">שלב {state.round} מתוך 10</h2>
      <div className="home__stage">
        <Board
          litColor={litColor}
          disabled={status !== 'awaitingInput'}
          paused={status === 'paused'}
          onPress={press}
          onKeyPress={pressAndRelease}
        />
        {state.resultShown && (
          <ResultDialog
            won={status === 'won'}
            completedRounds={state.completedRounds}
            onConfirm={dismiss}
          />
        )}
      </div>
      <div className="home__actions">
        {status === 'presenting' && <p className="home__status">המשחק מציג את הרצף</p>}
        {status === 'awaitingInput' && (
          <>
            <p className="home__status">התור שלך</p>
            <p className="home__hint">הקש על הצבעים לפי הסדר</p>
          </>
        )}
        {status === 'paused' && <p className="home__status">המשחק מושהה</p>}
        {(status === 'idle' || status === 'paused') && audioError && (
          <p className="home__error" role="alert">
            לא ניתן להפעיל את הצליל. נסו שוב.
          </p>
        )}
        {status === 'idle' && (
          <button type="button" className="btn btn--primary" onClick={() => void start()}>
            התחל משחק
          </button>
        )}
        {status === 'paused' && (
          <button type="button" className="btn btn--primary" onClick={() => void resume()}>
            המשך משחק
          </button>
        )}
      </div>
    </section>
  );
}
