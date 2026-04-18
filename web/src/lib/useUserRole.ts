'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from './supabaseBrowser';

export type UserRole = 'super_admin' | 'admin' | 'delegat' | 'viewer';

interface UserContext {
  email: string;
  role: UserRole;
  municipios: number[];
  isAdmin: boolean;
  isDireccion: boolean;
  loading: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || '';

export function useUserRole(): UserContext {
  const [ctx, setCtx] = useState<UserContext>({
    email: '', role: 'viewer', municipios: [], isAdmin: false, isDireccion: false, loading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setCtx(c => ({ ...c, loading: false }));
          return;
        }

        const res = await fetch(`${API}/api/admin/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const me = await res.json();
          const role = (me.rol || me.role || 'viewer') as UserRole;
          const isAdmin = role === 'super_admin' || role === 'admin';
          setCtx({
            email: me.email || session.user?.email || '',
            role,
            municipios: me.municipios || [],
            isAdmin,
            isDireccion: isAdmin,
            loading: false,
          });
        } else {
          setCtx(c => ({
            ...c,
            email: session.user?.email || '',
            loading: false,
          }));
        }
      } catch {
        setCtx(c => ({ ...c, loading: false }));
      }
    })();
  }, []);

  return ctx;
}
