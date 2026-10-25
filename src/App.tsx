import { useState } from 'react';
import { NavBar, type Screen } from './components/NavBar';
import { useGame, type GameDeps } from './game/useGame';
import { HomeScreen } from './screens/HomeScreen';
import { AboutScreen } from './screens/AboutScreen';

type Props = { gameDeps?: Partial<GameDeps> };

export function App({ gameDeps }: Props = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  const game = useGame(gameDeps);

  const navigate = (next: Screen) => {
    // פתרון זמני (M2): מעבר ל"אודות" באמצע משחק מבטל אותו; יוחלף בהשהיה ב-M3
    if (next === 'about') game.abandon();
    setScreen(next);
  };

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      </main>
      <NavBar active={screen} onChange={navigate} />
    </div>
  );
}
