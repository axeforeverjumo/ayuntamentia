'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Search,
  Bell,
  MapPin,
  FileText,
  Settings,
  Building2,
  LogOut,
  ShieldCheck,
  Crosshair,
  Radar,
  Users,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { APP_ROUTES, buildRoute } from '@/lib/routes';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  hint?: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: APP_ROUTES.tauler, label: 'Dashboard', icon: LayoutDashboard, hint: 'Visió executiva' },
  { href: APP_ROUTES.xat, label: "Sala d'Intel·ligència", icon: Crosshair, hint: 'Chat multi-mode' },
  { href: APP_ROUTES.cercar, label: 'Cercar', icon: Search, hint: 'Cerca universal' },
  { href: APP_ROUTES.alertes, label: 'Alertes', icon: Bell, hint: 'Regles actives' },
  { href: APP_ROUTES.municipis, label: 'Municipis', icon: MapPin, hint: '947 municipis' },
  { href: APP_ROUTES.regidors, label: 'Regidors', icon: Users, hint: 'Alineació i perfils' },
  { href: APP_ROUTES.reputacio, label: 'Reputació', icon: Radar, hint: 'Premsa · sentiment' },
  { href: APP_ROUTES.intelLigencia, label: 'Intel·ligència', icon: ShieldCheck, hint: 'Estratègia' },
  { href: APP_ROUTES.parlament, label: 'Parlament', icon: Building2, hint: 'DSPC · sessions' },
  { href: APP_ROUTES.informes, label: 'Informes', icon: FileText, hint: 'Biblioteca + briefs' },
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
    window.location.href = APP_ROUTES.inici;
  }

  if (pathname === APP_ROUTES.entrada || pathname === APP_ROUTES.inici) return null;

  const isLight = theme === 'light';

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40"
      style={{ width: 240, background: 'var(--bg-base)', borderRight: '.5px solid var(--border)' }}
    >
      {/* Brand */}
      <div style={{ padding: '14px 16px', borderBottom: '.5px solid var(--border)' }}>
        <Link href={APP_ROUTES.inici} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 26, height: 26, display: 'grid', placeItems: 'center',
            borderRadius: 6, background: 'var(--brand)', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 20 L12 3 L20 20 Z" stroke="white" strokeWidth="2" />
              <path d="M8 20 L12 12 L16 20" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              AjuntamentIA
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-timestamp)', letterSpacing: '.06em', marginTop: 1 }}>
              SALA D&apos;INTEL·LIGÈNCIA · v2.0
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }} className="thin-scroll">
        <p style={{
          fontFamily: 'var(--font-sans)', fontSize: 9.5, color: 'var(--text-disabled)',
          letterSpacing: '.08em', textTransform: 'uppercase', padding: '6px 8px 8px', margin: 0,
        }}>
          Operacions
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === APP_ROUTES.tauler
              ? pathname === APP_ROUTES.tauler
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                background: isActive
                  ? (isLight ? '#EAF2FB' : 'var(--bg-elevated)')
                  : 'transparent',
                color: isActive
                  ? (isLight ? 'var(--brand)' : 'var(--text-primary)')
                  : 'var(--text-meta)',
                fontWeight: isActive ? 500 : 400,
                textAlign: 'left', padding: '8px 10px', marginBottom: 1,
                borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--font-sans)', fontSize: 12.5,
                textDecoration: 'none',
              }}
            >
              <Icon size={15} strokeWidth={1.5} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{item.label}</div>
              </div>
              {item.href === APP_ROUTES.alertes && alertCount > 0 && (
                <span style={{
                  background: 'var(--danger)', color: '#fff',
                  fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 999, minWidth: 16, textAlign: 'center',
                }}>{alertCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '.5px solid var(--border)', padding: '10px 12px' }}>
        {user?.rol === 'admin' && (
          <Link
            href={APP_ROUTES.administracio}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
              marginBottom: 2, fontSize: 12.5, color: 'var(--text-meta)', textDecoration: 'none',
              borderRadius: 'var(--r-sm)',
              background: pathname.startsWith(APP_ROUTES.administracio) ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            <ShieldCheck size={15} strokeWidth={1.5} />
            <span>Admin</span>
          </Link>
        )}
        <button
          onClick={toggleTheme}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', marginBottom: 2, background: 'transparent', border: 'none',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text-meta)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {theme === 'dark' ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
          <span>{theme === 'dark' ? 'Mode clar' : 'Mode fosc'}</span>
        </button>
        <Link
          href={APP_ROUTES.configuracio}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
            marginBottom: 2, fontSize: 12.5, color: 'var(--text-meta)', textDecoration: 'none',
            borderRadius: 'var(--r-sm)',
          }}
        >
          <Settings size={15} strokeWidth={1.5} />
          <span>Configuració</span>
        </Link>
        {user && (
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', background: 'transparent', border: 'none',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-timestamp)', fontSize: 11.5, cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <LogOut size={15} strokeWidth={1.5} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
