'use client';

export const navItems = ['Agents', 'Builder', 'Exports', 'Deployments', 'Runtime Monitor', 'DLQ', 'Audit', 'Settings'] as const;

export type NavItem = typeof navItems[number];

interface AppShellProps {
  activeItem: NavItem;
  children: React.ReactNode;
  onSelectItem: (item: NavItem) => void;
}

export function AppShell({ activeItem, children, onSelectItem }: Readonly<AppShellProps>) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Aether / Aegis Flow</div>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item}
              className={item === activeItem ? 'active' : undefined}
              onClick={() => onSelectItem(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
