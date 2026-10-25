export type Screen = 'home' | 'about';

const ITEMS: { id: Screen; label: string }[] = [
  { id: 'home', label: 'בית' },
  { id: 'about', label: 'אודות' },
];

type Props = { active: Screen; onChange: (screen: Screen) => void };

export function NavBar({ active, onChange }: Props) {
  return (
    <nav className="navbar" aria-label="ניווט ראשי">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="navbar__item"
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
