import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../App';
import type { AudioEngine } from '../audio/audioEngine';
import { COLORS, type GameColor } from './colors';
import type { GameDeps } from './useGame';

const QUEUE: GameColor[] = ['green', 'red', 'blue', 'yellow', 'green', 'green', 'red', 'blue', 'yellow', 'red'];
const LABEL = Object.fromEntries(COLORS.map((c) => [c.id, c.label])) as Record<GameColor, string>;

/** משך הצגת רצף באורך n כולל ההמתנה ההתחלתית */
const presentMs = (n: number) => 1000 + n * 600 + (n - 1) * 250;

function setup(opts: { unlock?: boolean; queue?: GameColor[]; strict?: boolean } = {}) {
  const queue = [...(opts.queue ?? QUEUE)];
  const engine = {
    unlock: vi.fn(async () => opts.unlock ?? true),
    startTone: vi.fn((_color: GameColor) => vi.fn()),
    playWin: vi.fn(),
    playLoss: vi.fn(),
    stopAll: vi.fn(),
  } satisfies AudioEngine;
  const confetti = { fire: vi.fn(), reset: vi.fn() };
  const gameDeps: Partial<GameDeps> = { engine, confetti, randomColor: () => queue.shift() ?? 'red' };
  const ui = <App gameDeps={gameDeps} />;
  render(opts.strict ? <StrictMode>{ui}</StrictMode> : ui);
  return { engine, confetti };
}

/** מתקדם בצעדים, כדי ש-React יספיק להריץ Effects בין Timers (כמו בדפדפן אמיתי) */
const advance = async (ms: number) => {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      vi.advanceTimersByTime(Math.min(50, left));
    });
  }
};
const tap = (color: GameColor) => {
  fireEvent.pointerDown(screen.getByRole('button', { name: LABEL[color] }), { pointerType: 'touch' });
  fireEvent.pointerUp(window);
};
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

/** משחק מהתחלה עד שלב n מוכן לקלט */
async function playTo(n: number) {
  await click('התחל משחק');
  await advance(presentMs(1));
  for (let r = 1; r < n; r++) {
    for (let i = 0; i < r; i++) tap(QUEUE[i]);
    await advance(1000 + presentMs(r + 1));
  }
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('משחק מלא', () => {
  it('מציג את הרצף בקצב קבוע וחוסם קלט עד סיומו', async () => {
    const { engine } = setup();
    await click('התחל משחק');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeDisabled();

    await advance(999);
    expect(engine.startTone).not.toHaveBeenCalled();
    await advance(1);
    expect(engine.startTone).toHaveBeenCalledWith('green');
    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveClass('quadrant--lit');
    expect(screen.getByRole('button', { name: 'אדום' })).toHaveClass('quadrant--dim');

    tap('green'); // חסום
    await advance(599);
    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveClass('quadrant--lit');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    await advance(1);
    expect(screen.getByRole('button', { name: 'ירוק' })).not.toHaveClass('quadrant--lit');
    expect(engine.startTone).toHaveBeenCalledTimes(1);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeEnabled();
  });

  it('שלב 2: חיווי השלב נשאר שנייה, ואז שנייה עד הצבע הראשון', async () => {
    const { engine } = setup();
    await playTo(1);
    tap('green');
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeDisabled();
    await advance(999);
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    await advance(1);
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument();
    engine.startTone.mockClear();
    await advance(999);
    expect(engine.startTone).not.toHaveBeenCalled();
    await advance(1);
    expect(engine.startTone).toHaveBeenLastCalledWith('green');
    await advance(600 + 250);
    expect(engine.startTone).toHaveBeenLastCalledWith('red');
  });

  it('לחיצה נכונה מקדמת ושגויה מפסידה; הודעת ההפסד אחרי שנייה', async () => {
    const { engine, confetti } = setup();
    await playTo(2);
    engine.startTone.mockClear();
    tap('green');
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    tap('blue'); // שגוי: הרצף green,red
    expect(engine.startTone).toHaveBeenLastCalledWith('blue'); // צליל הצבע מיד
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(engine.playLoss).not.toHaveBeenCalled();
    await advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
    expect(screen.getByText('הושלם שלב אחד')).toBeInTheDocument();
    expect(engine.playLoss).toHaveBeenCalledTimes(1);
    expect(confetti.fire).not.toHaveBeenCalled();
  });

  it('הפסד בשלב 1: 0 שלבים הושלמו, ו"אישור" מחזיר להתחלה עם רצף חדש', async () => {
    const { engine } = setup();
    await playTo(1);
    tap('red'); // הרצף: green
    await advance(1000);
    expect(screen.getByText('הושלמו 0 שלבים')).toBeInTheDocument();
    await click('אישור');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    engine.startTone.mockClear();
    await click('התחל משחק');
    await advance(1000);
    expect(engine.startTone).toHaveBeenLastCalledWith('red'); // צבע חדש מהתור (רצף חדש, לא green)
  });

  it('ניצחון בשלב 10: קונפטי וצליל ניצחון פעם אחת, ללא שלב 11', async () => {
    const { engine, confetti } = setup();
    await playTo(10);
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument();
    for (let i = 0; i < 10; i++) tap(QUEUE[i]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(confetti.fire).not.toHaveBeenCalled();
    await advance(1000);
    expect(screen.getByText('כל הכבוד! ניצחת!')).toBeInTheDocument();
    expect(screen.getByText('הושלמו 10 שלבים')).toBeInTheDocument();
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument();
    expect(confetti.fire).toHaveBeenCalledTimes(1);
    expect(engine.playWin).toHaveBeenCalledTimes(1);
    expect(engine.playLoss).not.toHaveBeenCalled();
    await advance(10000);
    expect(confetti.fire).toHaveBeenCalledTimes(1);
    await click('אישור');
    expect(confetti.reset).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('כשל בהפעלת אודיו: הודעה, והמשחק לא מתקדם; ניסיון חוזר אפשרי', async () => {
    const { engine } = setup({ unlock: false });
    await click('התחל משחק');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן להפעיל את הצליל');
    await advance(5000);
    expect(engine.startTone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    engine.unlock.mockResolvedValue(true);
    await click('התחל משחק');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  const nav = (name: 'בית' | 'אודות') => fireEvent.click(screen.getByRole('button', { name }));

  it.each([
    ['באמצע הצגה', 1500, 2],
    ['באמצע קלט', 0, 2],
    ['בין שלבים', 0, 3],
  ] as const)('מעבר ל"אודות" %s משהה; חזרה לבית לא מחדשת', async (name, ms, expectedRound) => {
    const { engine } = setup();
    if (name === 'באמצע הצגה') {
      await playTo(1);
      tap('green');
      await advance(1000 + ms);
    } else if (name === 'באמצע קלט') {
      await playTo(2);
      tap('green');
    } else {
      await playTo(2);
      tap('green');
      tap('red');
    }
    engine.stopAll.mockClear();
    nav('אודות');
    expect(engine.stopAll).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    nav('בית');
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    expect(screen.getByText(`שלב ${expectedRound} מתוך 10`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ירוק' })).not.toHaveClass('quadrant--lit');
    engine.startTone.mockClear();
    tap('green');
    await advance(10000);
    expect(engine.startTone).not.toHaveBeenCalled();
    expect(engine.playLoss).not.toHaveBeenCalled();
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
  });

  it('"המשך משחק" מציג מחדש את כל הרצף, והשחזור מתחיל מההתחלה', async () => {
    const { engine } = setup();
    await playTo(3);
    tap('green');
    tap('red'); // חלק מהרצף הוקש
    nav('אודות');
    nav('בית');
    engine.startTone.mockClear();
    engine.unlock.mockClear();
    await click('המשך משחק');
    expect(engine.unlock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    await advance(999);
    expect(engine.startTone).not.toHaveBeenCalled();
    await advance(presentMs(3) - 999);
    expect(engine.startTone.mock.calls.map((c) => c[0])).toEqual(['green', 'red', 'blue']);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument();
    // שחזור מההתחלה: כל הרצף נדרש שוב
    tap('green');
    tap('red');
    tap('blue');
    await advance(1000);
    expect(screen.getByText('שלב 4 מתוך 10')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('השהיה בין שלבים: "המשך משחק" מציג את הרצף המלא של השלב הבא', async () => {
    const { engine } = setup();
    await playTo(2);
    tap('green');
    tap('red');
    nav('אודות');
    nav('בית');
    engine.startTone.mockClear();
    await click('המשך משחק');
    await advance(presentMs(3));
    expect(engine.startTone.mock.calls.map((c) => c[0])).toEqual(['green', 'red', 'blue']);
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument();
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('כשל אודיו ב-"המשך משחק" משאיר מושהה; ניסיון חוזר מצליח', async () => {
    const { engine } = setup();
    await playTo(1);
    nav('אודות');
    nav('בית');
    engine.unlock.mockResolvedValueOnce(false);
    await click('המשך משחק');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן להפעיל את הצליל');
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    await advance(5000);
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    await click('המשך משחק');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('לחיצה כפולה על "המשך משחק" מציגה את הרצף פעם אחת', async () => {
    const { engine } = setup();
    await playTo(1);
    nav('אודות');
    nav('בית');
    engine.startTone.mockClear();
    const btn = screen.getByRole('button', { name: 'המשך משחק' });
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    expect(engine.unlock).toHaveBeenCalledTimes(2); // אחת מ-"התחל משחק", אחת מ-"המשך משחק"
    await advance(presentMs(1));
    expect(engine.startTone).toHaveBeenCalledTimes(1);
  });

  it.each(['visibilitychange', 'pagehide'])('%s משהה; חזרה ל-visible לא מחדשת', async (event) => {
    const { engine } = setup();
    await playTo(1);
    let visibility: DocumentVisibilityState = 'hidden';
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    act(() => {
      if (event === 'pagehide') window.dispatchEvent(new Event('pagehide'));
      else document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(engine.stopAll).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    visibility = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    engine.startTone.mockClear();
    await advance(5000);
    expect(engine.startTone).not.toHaveBeenCalled();
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('visibilitychange ל-visible בזמן משחק לא משהה', async () => {
    setup();
    await playTo(1);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('"המשך משחק" לא מוצג לפני משחק ואחרי סיומו; מעבר ל"אודות" לפני הודעת ההפסד אינו משהה', async () => {
    const { engine } = setup();
    nav('אודות');
    nav('בית');
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    await playTo(1);
    tap('red');
    nav('אודות');
    await advance(1000);
    expect(engine.playLoss).toHaveBeenCalledTimes(1);
    nav('בית');
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    await click('אישור');
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('רענון (mount חדש) מאפס משחק מושהה', async () => {
    setup();
    await playTo(2);
    nav('אודות');
    cleanup();
    setup();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('Strict Mode: השהיה וחידוש לא מכפילים הצגה', async () => {
    const { engine } = setup({ strict: true });
    await playTo(1);
    nav('אודות');
    nav('בית');
    engine.startTone.mockClear();
    await click('המשך משחק');
    await advance(presentMs(1));
    expect(engine.startTone).toHaveBeenCalledTimes(1);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('Strict Mode: הצג צליל אחד לכל צבע, וצליל הפסד פעם אחת', async () => {
    const { engine } = setup({ strict: true });
    await click('התחל משחק');
    await advance(presentMs(1));
    expect(engine.startTone).toHaveBeenCalledTimes(1);
    tap('red');
    await advance(1000);
    expect(engine.playLoss).toHaveBeenCalledTimes(1);
  });

  it('הארה בלחיצה נמשכת לפחות 300ms וכל עוד האצבע לוחצת', async () => {
    setup();
    await playTo(1);
    const btn = screen.getByRole('button', { name: 'ירוק' });
    fireEvent.pointerDown(btn, { pointerType: 'touch' });
    fireEvent.pointerUp(window);
    await advance(299);
    expect(btn).toHaveClass('quadrant--lit');
    await advance(1);
    expect(btn).not.toHaveClass('quadrant--lit');

    // לחיצה ארוכה בשלב 2
    await advance(1000 + presentMs(2));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'ירוק' }), { pointerType: 'touch' });
    await advance(800);
    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveClass('quadrant--lit');
    fireEvent.pointerUp(window);
    await advance(1);
    expect(screen.getByRole('button', { name: 'ירוק' })).not.toHaveClass('quadrant--lit');
  });
});
