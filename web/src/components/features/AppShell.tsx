'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { APP_ROUTES, PUBLIC_ROUTES } from '@/lib/routes';

const SHELL_EXCLUDED = [...PUBLIC_ROUTES];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const excluded = SHELL_EXCLUDED.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p),
  );

  if (excluded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <div className={open ? 'block' : 'hidden md:block'}>
        <Sidebar />
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-3 left-3 z-50 p-2"
        style={{
          borderRadius: 'var(--r-sm)',
          background: 'var(--bg-elevated)',
          border: '.5px solid var(--border)',
          color: 'var(--text-primary)',
        }}
        aria-label="Menu"
      >
        {open ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
      </button>
      <main className="min-h-screen md:ml-60 pt-12 md:pt-0">
        {children}
      </main>
    </div>
  );
}
