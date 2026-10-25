import { useEffect, useRef, useState } from 'react';
import { NavBar, type Screen } from './components/NavBar';
import { useGame, type GameDeps } from './game/useGame';
import type { GetStorage } from './history/historyStorage';
import { useHistory } from './history/useHistory';
import { HomeScreen } from './screens/HomeScreen';
import { AboutScreen } from './screens/AboutScreen';

type Props = { gameDeps?: Partial<GameDeps>; getStorage?: GetStorage };

export function App({ gameDeps, getStorage }: Props = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  const game = useGame(gameDeps);
  const history = useHistory(getStorage);

  // רישום תוצאה פעם אחת בכניסה ל-won/lost; ה-ref שומר מפני הרצה כפולה (Strict Mode) ו"אישור" (ADR-4)
  const lastRecorded = useRef<number | null>(null);
  const { status, gameId, completedRounds } = game.state;
  const { record } = history;
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (lastRecorded.current === gameId) return;
    lastRecorded.current = gameId;
    record(status === 'won' ? 'win' : 'loss', completedRounds);
  }, [status, gameId, completedRounds, record]);

  const navigate = (next: Screen) => {
    if (next === 'about') game.pause();
    setScreen(next);
  };

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? (
          <HomeScreen game={game} saveError={history.saveError} />
        ) : (
          <AboutScreen history={history} />
        )}
      </main>
      <NavBar active={screen} onChange={navigate} />
    </div>
  );
}
