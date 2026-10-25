import { Board } from '../components/Board';

export function HomeScreen() {
  return (
    <section className="screen home">
      <header className="screen__header">
        <h1>דיסקו גו</h1>
      </header>
      <h2 className="home__round">שלב 1 מתוך 10</h2>
      <Board />
      <div className="home__actions">
        <button type="button" className="btn btn--primary">
          התחל משחק
        </button>
      </div>
    </section>
  );
}
