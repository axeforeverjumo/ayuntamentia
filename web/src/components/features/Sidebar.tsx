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
  ChevronRight,
  LogOut,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/chat', label: 'Chat IA', icon: MessageSquare },
  { href: '/alertas', label: 'Alertes', icon: Bell },
  { href: '/municipios', label: 'Municipis', icon: MapPin },
  { href: '/informes', label: 'Informes', icon: FileText },
  { href: '/suscripciones', label: 'Subscripcions', icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; rol?: string } | null>(null);

  useEffect(() => {
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
    window.location.href = '/login';
  }

  if (pathname === '/login') return null;

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#0d1117] border-r border-[#21262d] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#21262d]">
        <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#e6edf3] truncate">
            AyuntamentIA
          </p>
          <p className="text-[10px] text-[#6e7681] truncate">
            947 municipis · Catalunya
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider px-2 mb-2">
          Navegació
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all group',
                isActive
                  ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]',
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-[#2563eb]' : 'text-current',
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3 h-3 text-[#2563eb] flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#21262d] space-y-0.5">
        {user?.rol === 'admin' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all',
              pathname.startsWith('/admin')
                ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
                : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]',
            )}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Admin</span>
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all',
            pathname === '/settings'
              ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
              : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]',
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span>Configuració</span>
        </Link>
        {user && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </button>
        )}
        <div className="mt-3 px-2.5">
          <p className="text-[10px] text-[#6e7681]">
            v1.0.0 · Ajuntaments de Catalunya
          </p>
        </div>
      </div>
    </aside>
  );
}
