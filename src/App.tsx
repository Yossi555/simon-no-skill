import { useState } from 'react';
import { NavBar, type Screen } from './components/NavBar';
import { HomeScreen } from './screens/HomeScreen';
import { AboutScreen } from './screens/AboutScreen';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      </main>
      <NavBar active={screen} onChange={setScreen} />
    </div>
  );
}
