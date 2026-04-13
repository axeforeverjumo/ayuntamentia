'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/ApiClient';

type Sub = {
  id: number;
  nombre: string;
  temas: string[];
  municipios: number[];
  canal: 'email' | 'telegram' | 'both';
  cron_expr: string;
  activo: boolean;
  last_sent_at: string | null;
};

const TEMAS = [
  'medio_ambiente', 'comercio', 'pesca', 'agricultura', 'caza',
  'urbanismo', 'seguridad', 'servicios_sociales', 'vivienda',
  'educacion', 'salud', 'transporte', 'cultura', 'mociones',
];

type Me = { telegram_chat_id: number | null };

export default function SuscripcionesPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [linkCode, setLinkCode] = useState<{ code: string; instructions: string } | null>(null);
  const [nombre, setNombre] = useState('');
  const [temas, setTemas] = useState<string[]>([]);
  const [canal, setCanal] = useState<'email' | 'telegram' | 'both'>('telegram');
  const [cron, setCron] = useState('0 8 * * 5');
  const [preview, setPreview] = useState<string | null>(null);

  async function load() {
    const data = await apiClient.get<Sub[]>('/api/subscripciones');
    setSubs(data);
    apiClient.get<Me>('/api/admin/me').then(setMe).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function generateLink() {
    const r = await apiClient.post<{ code: string; instructions: string }>('/api/admin/me/telegram-link-code', {});
    setLinkCode(r);
  }
  async function unlinkTelegram() {
    await apiClient.delete('/api/admin/me/telegram');
    setMe({ telegram_chat_id: null });
  }

  async function create() {
    await apiClient.post('/api/subscripciones', {
      nombre, temas, municipios: [], canal, cron_expr: cron, activo: true,
    });
    setNombre(''); setTemas([]);
    load();
  }

  async function remove(id: number) {
    await apiClient.delete(`/api/subscripciones/${id}`);
    load();
  }

  async function showPreview(id: number) {
    const data = await apiClient.post<{ brief: string }>(`/api/subscripciones/${id}/preview`, {});
    setPreview(data.brief);
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-2">Subscripcions a informes temàtics</h1>
      <p className="text-sm text-[#8b949e] mb-6">
        Rep un brief automàtic per email o Telegram amb els temes que t&apos;interessen.
      </p>

      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Telegram</p>
          <p className="text-xs text-[#8b949e]">
            {me?.telegram_chat_id
              ? `Vinculat (chat ${me.telegram_chat_id})`
              : 'No vinculat — vincula per rebre briefs i alertes'}
          </p>
        </div>
        {me?.telegram_chat_id ? (
          <button onClick={unlinkTelegram} className="text-xs text-red-400 hover:underline">Desvincular</button>
        ) : (
          <button onClick={generateLink}
                  className="bg-[#2563eb] hover:bg-[#1e50d2] text-white px-3 py-1.5 rounded text-xs">
            Vincular Telegram
          </button>
        )}
      </div>

      {linkCode && (
        <div className="bg-amber-950/40 border border-amber-700 rounded-lg p-4 mb-6 text-sm">
          <p className="font-medium mb-1">Codi: <code className="text-lg">{linkCode.code}</code></p>
          <p className="text-[#e6edf3]">{linkCode.instructions}</p>
          <p className="text-xs text-amber-300 mt-1">Caduca en 15 minuts.</p>
        </div>
      )}

      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 mb-8">
        <h2 className="text-sm font-semibold mb-4">Nova subscripció</h2>
        <input
          placeholder="Nom (ex: Brief setmanal medi ambient)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm"
        />
        <div className="mb-3">
          <p className="text-xs text-[#8b949e] mb-2">Temes</p>
          <div className="flex flex-wrap gap-2">
            {TEMAS.map((t) => (
              <button
                key={t}
                onClick={() => setTemas(temas.includes(t) ? temas.filter((x) => x !== t) : [...temas, t])}
                className={
                  'px-3 py-1 rounded-full text-xs border ' +
                  (temas.includes(t)
                    ? 'bg-[#2563eb] border-[#2563eb] text-white'
                    : 'border-[#30363d] text-[#8b949e]')
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select value={canal} onChange={(e) => setCanal(e.target.value as 'email' | 'telegram' | 'both')}
                  className="px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm">
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
            <option value="both">Tots dos</option>
          </select>
          <input value={cron} onChange={(e) => setCron(e.target.value)}
                 placeholder="cron (ex: 0 8 * * 5 = divendres 8h)"
                 className="px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm font-mono" />
        </div>
        <button onClick={create} disabled={!nombre || temas.length === 0}
                className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white px-4 py-2 rounded text-sm">
          Crear
        </button>
      </div>

      <div className="space-y-3">
        {subs.map((s) => (
          <div key={s.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium">{s.nombre}</p>
              <p className="text-xs text-[#8b949e]">
                {s.temas.join(', ')} · {s.canal} · <code>{s.cron_expr}</code>
                {s.last_sent_at && ` · últim enviament ${s.last_sent_at.slice(0, 16)}`}
              </p>
            </div>
            <button onClick={() => showPreview(s.id)} className="text-xs text-[#2563eb] hover:underline">Previsualitza</button>
            <button onClick={() => remove(s.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setPreview(null)}>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto whitespace-pre-wrap text-sm" onClick={(e) => e.stopPropagation()}>
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}
