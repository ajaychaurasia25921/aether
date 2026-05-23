import Link from 'next/link';

const navItems = ['Agents', 'Builder', 'Exports', 'Deployments', 'Runtime Monitor', 'DLQ', 'Audit', 'Settings'];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Aether / Aegis Flow</div>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item, index) => (
            <Link key={item} className={index === 0 ? 'active' : undefined} href="#">
              {item}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
