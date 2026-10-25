export function AboutScreen() {
  return (
    <section className="screen about">
      <header className="screen__header">
        <h1>אודות</h1>
      </header>
      <div className="card">
        <h2>על המשחק</h2>
        <ul className="about__rules">
          <li>זכרו את רצף הצבעים שמוצג.</li>
          <li>לחצו על הצבעים באותו סדר.</li>
          <li>בכל שלב מתווסף צבע אחד לרצף.</li>
          <li>טעות אחת מסיימת את המשחק.</li>
          <li>שחזור נכון של 10 שלבים מזכה בניצחון.</li>
        </ul>
      </div>
      <h2 className="about__history-title">10 המשחקים האחרונים</h2>
      <p className="card card--empty">עדיין אין משחקים שמורים.</p>
    </section>
  );
}
