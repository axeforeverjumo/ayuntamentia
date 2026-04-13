'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/ApiClient';

type User = {
  user_id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  areas: string[];
  n_municipios: number;
  created_at: string;
};

type UsageRow = {
  id: number;
  user_id: string | null;
  user_nombre: string | null;
  user_rol: string | null;
  accion: string;
  payload: Record<string, unknown> | null;
  response_meta: Record<string, unknown> | null;
  created_at: string;
};

type Summary = {
  user_id: string;
  nombre: string;
  rol: string;
  total: number;
  queries_chat: number;
  queries_search: number;
  last_activity: string | null;
};

const TABS = ['Resum', 'Usuaris', 'Audit log'] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resum');
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<User[]>('/api/admin/users').then(setUsers).catch((e) => setError(e.message));
    apiClient.get<UsageRow[]>('/api/admin/usage?limit=200').then(setUsage).catch(() => {});
    apiClient.get<Summary[]>('/api/admin/usage/summary').then(setSummary).catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-semibold mb-2">Panell d&apos;administració</h1>
      <p className="text-sm text-[#8b949e] mb-6">Gestió d&apos;usuaris, monitorització d&apos;ús i auditoria.</p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-4 border-b border-[#30363d] mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-3 py-2 text-sm border-b-2 -mb-px ' +
              (tab === t ? 'border-[#2563eb] text-white' : 'border-transparent text-[#8b949e]')
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resum' && (
        <table className="w-full text-sm">
          <thead className="text-xs text-[#8b949e] uppercase">
            <tr>
              <th className="text-left py-2">Usuari</th>
              <th className="text-left">Rol</th>
              <th className="text-right px-3">Total 30d</th>
              <th className="text-right px-3">Chat</th>
              <th className="text-right px-3">Cerca</th>
              <th className="text-left pl-6">Última activitat</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.user_id} className="border-t border-[#21262d]">
                <td className="py-2">{s.nombre}</td>
                <td>{s.rol}</td>
                <td className="text-right px-3">{s.total}</td>
                <td className="text-right px-3">{s.queries_chat}</td>
                <td className="text-right px-3">{s.queries_search}</td>
                <td className="text-[#8b949e] pl-6">{s.last_activity?.slice(0, 16) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Usuaris' && (
        <table className="w-full text-sm">
          <thead className="text-xs text-[#8b949e] uppercase">
            <tr>
              <th className="text-left py-2">Nom</th>
              <th className="text-left">Rol</th>
              <th className="text-left">Àrees</th>
              <th className="text-right">Municipis</th>
              <th className="text-left">Estat</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-t border-[#21262d]">
                <td className="py-2">{u.nombre}</td>
                <td>{u.rol}</td>
                <td className="text-[#8b949e]">{u.areas.join(', ') || '—'}</td>
                <td className="text-right">{u.n_municipios}</td>
                <td>{u.activo ? '🟢' : '🔴'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Audit log' && (
        <table className="w-full text-sm">
          <thead className="text-xs text-[#8b949e] uppercase">
            <tr>
              <th className="text-left py-2">Quan</th>
              <th className="text-left">Usuari</th>
              <th className="text-left">Acció</th>
              <th className="text-left">Detall</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={u.id} className="border-t border-[#21262d] align-top">
                <td className="py-2 text-[#8b949e] whitespace-nowrap">{u.created_at.slice(0, 19).replace('T', ' ')}</td>
                <td>{u.user_nombre ?? '—'}</td>
                <td>{u.accion}</td>
                <td className="text-[#8b949e]">
                  {u.payload ? <code className="text-xs">{JSON.stringify(u.payload).slice(0, 120)}</code> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
