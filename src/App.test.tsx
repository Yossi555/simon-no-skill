import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { COLORS } from './game/colors';

describe('App', () => {
  it('מציג את מסך הבית', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'דיסקו גו' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    for (const c of COLORS) {
      expect(screen.getByRole('button', { name: c.label })).toBeInTheDocument();
    }
  });

  it('מסדר את ארבעת הרבעים לפי המיקום המרחבי', () => {
    const area = Object.fromEntries(COLORS.map((c) => [c.label, c.gridArea]));
    render(<App />);
    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveStyle({ gridArea: area['ירוק'] });
    expect(area).toEqual({
      ירוק: '1 / 1', // למעלה משמאל
      אדום: '1 / 2', // למעלה מימין
      צהוב: '2 / 1', // למטה משמאל
      כחול: '2 / 2', // למטה מימין
    });
  });

  it('עובר בין בית לאודות בלי מסך שלישי', async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole('navigation');
    expect(nav.querySelectorAll('button')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'בית' }));
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
  });

  it('מגדיר עברית ו-RTL ב-HTML', async () => {
    const { readFileSync } = await import('node:fs');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('lang="he"');
    expect(html).toContain('dir="rtl"');
  });
});
