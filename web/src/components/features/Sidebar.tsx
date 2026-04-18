'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  Bell,
  MapPin,
  FileText,
  Settings,
  Building2,
  LogOut,
  ShieldCheck,
  Mail,
  Crosshair,
  Radar,
  Users,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Visió executiva' },
  { href: '/chat', label: 'War Room', icon: Crosshair, hint: 'Chat multi-mode' },
  { href: '/buscar', label: 'Cercar', icon: Search, hint: 'Cerca universal' },
  { href: '/alertas', label: 'Alertes', icon: Bell, hint: 'Regles actives' },
  { href: '/municipios', label: 'Municipis', icon: MapPin, hint: '947 municipis' },
  { href: '/regidors', label: 'Regidors', icon: Users, hint: 'Alineació i perfils' },
  { href: '/intel', label: 'Intel·ligència', icon: Radar, hint: 'Estratègia' },
  { href: '/parlament', label: 'Parlament', icon: Building2, hint: 'DSPC · sessions' },
  { href: '/informes', label: 'Informes', icon: FileText, hint: 'Biblioteca + briefs' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState<{ email: string; rol?: string } | null>(null);
  const [alertCount, setAlertCount] = useState<number>(0);

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/alertas/stats/resumen')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAlertCount(d.nuevas || 0); })
      .catch(() => {});
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email ?? '' });
    });
    fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/admin/me', {
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (r) => {
        if (!r.ok) return;
        const token = (await getSupabaseBrowser().auth.getSession()).data.session?.access_token;
        if (!token) return;
        const r2 = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r2.ok) {
          const me = await r2.json();
          setUser((u) => (u ? { ...u, rol: me.rol } : u));
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await getSupabaseBrowser().auth.signOut();
    window.location.href = '/';
  }

  if (pathname === '/login' || pathname === '/') return null;

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-40"
      style={{ background: '#0a0a0a', borderRight: '1px solid var(--line)' }}
    >
      {/* Brand */}
      <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div
            style={{
              width: 34, height: 34, display: 'grid', placeItems: 'center',
              border: '1px solid var(--paper)', background: 'var(--paper)', color: 'var(--ink)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 20 L12 3 L20 20 Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 20 L12 12 L16 20" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1, color: 'var(--paper)' }}>AyuntamentIA</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 2 }}>
              war room · v2.0
            </div>
          </div>
        </Link>
        <div
          className="mt-2.5 flex items-center gap-2"
          style={{ padding: '7px 10px', background: '#111', border: '1px solid var(--line)' }}
        >
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: 7, background: 'var(--wr-phosphor)', boxShadow: '0 0 6px var(--wr-phosphor)' }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 11, color: 'var(--paper)' }}>Aliança Catalana</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>tenant actiu · operatiu</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto thin-scroll">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '6px 8px 8px' }}>
          Operacions
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="no-underline"
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                background: isActive ? 'var(--paper)' : 'transparent',
                color: isActive ? 'var(--ink)' : 'var(--paper)',
                textAlign: 'left', padding: '9px 10px', marginBottom: 1,
                fontFamily: 'var(--font-sans)', fontSize: 13,
                borderLeft: isActive ? '3px solid var(--wr-red)' : '3px solid transparent',
                textDecoration: 'none',
              }}
            >
              <Icon className="w-4 h-4" style={{ opacity: isActive ? 1 : .7 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</div>
                {item.hint && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em', opacity: .6, marginTop: 1 }}>
                    {item.hint}
                  </div>
                )}
              </div>
              {item.href === '/alertas' && alertCount > 0 && (
                <span style={{
                  background: 'var(--wr-red)', color: 'var(--paper)', fontFamily: 'var(--font-mono)',
                  fontSize: 10, padding: '2px 6px', minWidth: 18, textAlign: 'center',
                }}>{alertCount}</span>
              )}
              {item.href === '/alertas' && alertCount === 0 && (
                <span style={{
                  color: 'var(--wr-phosphor)', fontFamily: 'var(--font-mono)', fontSize: 10,
                }}>✓</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 12px' }}>
        {user?.rol === 'admin' && (
          <Link
            href="/admin"
            className="no-underline"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              marginBottom: 4, fontSize: 13, color: 'var(--paper)', textDecoration: 'none',
              background: pathname.startsWith('/admin') ? 'var(--ink-4)' : 'transparent',
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </Link>
        )}
        <button
          onClick={toggleTheme}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', marginBottom: 4, background: 'transparent', border: 'none',
            color: 'var(--bone)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Mode clar' : 'Mode fosc'}</span>
        </button>
        <Link
          href="/settings"
          className="no-underline"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            marginBottom: 4, fontSize: 13, color: 'var(--bone)', textDecoration: 'none',
          }}
        >
          <Settings className="w-4 h-4" />
          <span>Configuració</span>
        </Link>
        {user && (
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', background: 'transparent', border: 'none',
              color: 'var(--fog)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="truncate">{user.email}</span>
          </button>
        )}
        <div style={{ marginTop: 8, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.08em' }}>
          v2.0 · Factoria IA
        </div>
      </div>
    </aside>
  );
}
