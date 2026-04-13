'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

const AUTH_ROUTES = ['/login', '/legal'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAuth = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (isAuth) {
    return <div className="min-h-screen">{children}</div>;
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
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded bg-[#161b22] border border-[#30363d]"
        aria-label="Menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      <main className="min-h-screen md:ml-60 pt-12 md:pt-0">
        {children}
      </main>
    </div>
  );
}
