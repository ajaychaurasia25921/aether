import './styles.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aether / Aegis Flow',
  description: 'Enterprise agentic orchestration dashboard',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
