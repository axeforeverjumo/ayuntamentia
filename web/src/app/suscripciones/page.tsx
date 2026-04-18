'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/ApiClient';
import { CronPicker } from '@/components/ui/CronPicker';

type Sub = {
  id: number;
  nombre: string;
  temas: string[];
  municipios: number[];
  prompt_libre: string | null;
  ventana_dias: number | null;
  canal: 'email' | 'telegram' | 'both';
  cron_expr: string;
  activo: boolean;
  last_sent_at: string | null;
};

const EJEMPLOS_LIBRE = [
  'Tot el que es parli d\'Aliança Catalana a plens i a premsa',
  'Moviments del PP a municipis on governem',
  'Contradiccions del PSC entre Parlament i municipis sobre habitatge',
  'Propostes rebutjades sobre seguretat a l\'àrea metropolitana',
];

const TEMAS = [
  'medio_ambiente', 'comercio', 'pesca', 'agricultura', 'caza',
  'urbanismo', 'seguridad', 'servicios_sociales', 'vivienda',
  'educacion', 'salud', 'transporte', 'cultura', 'mociones',
];

type Me = { telegram_chat_id: number | null };

export default function SuscripcionesPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [linkCode, setLinkCode] = useState<{ code: string; instructions: string; bot_url?: string } | null>(null);
  const [nombre, setNombre] = useState('');
  const [modo, setModo] = useState<'temas' | 'libre'>('temas');
  const [temas, setTemas] = useState<string[]>([]);
  const [promptLibre, setPromptLibre] = useState('');
  const [canal, setCanal] = useState<'email' | 'telegram' | 'both'>('telegram');
  const [cron, setCron] = useState('0 8 * * 5');
  const [ventanaDias, setVentanaDias] = useState(7);
  const [preview, setPreview] = useState<{ open: boolean; loading: boolean; brief: string | null }>({
    open: false, loading: false, brief: null,
  });

  async function load() {
    const data = await apiClient.get<Sub[]>('/api/subscripciones');
    setSubs(data);
    apiClient.get<Me>('/api/admin/me').then(setMe).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function generateLink() {
    const r = await apiClient.post<{ code: string; instructions: string; bot_url?: string }>('/api/admin/me/telegram-link-code', {});
    setLinkCode(r);
    if (r.bot_url) window.open(r.bot_url, '_blank');
  }
  async function unlinkTelegram() {
    await apiClient.delete('/api/admin/me/telegram');
    setMe({ telegram_chat_id: null });
  }

  async function create() {
    await apiClient.post('/api/subscripciones', {
      nombre,
      temas: modo === 'temas' ? temas : [],
      municipios: [],
      prompt_libre: modo === 'libre' ? promptLibre.trim() : null,
      ventana_dias: ventanaDias,
      canal,
      cron_expr: cron,
      activo: true,
    });
    setNombre(''); setTemas([]); setPromptLibre('');
    load();
  }

  const canCreate = !!nombre && (
    (modo === 'temas' && temas.length > 0) ||
    (modo === 'libre' && promptLibre.trim().length >= 10)
  );

  async function remove(id: number) {
    await apiClient.delete(`/api/subscripciones/${id}`);
    load();
  }

  async function showPreview(id: number) {
    setPreview({ open: true, loading: true, brief: null });
    try {
      const data = await apiClient.post<{ brief: string }>(`/api/subscripciones/${id}/preview`, {});
      setPreview({ open: true, loading: false, brief: data.brief });
    } catch (e) {
      setPreview({ open: true, loading: false, brief: `Error generant el brief: ${String(e)}` });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>Operacions / Subscripcions</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1, margin: 0, letterSpacing: '-.02em', fontWeight: 400, color: 'var(--paper)' }}>
          Subscripcions <em style={{ color: 'var(--bone)' }}>actives.</em>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', marginTop: 8 }}>Briefs automàtics per email o Telegram</p>
      </div>
      <div style={{ padding: '20px 26px', maxWidth: 900 }}>

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
        <div className="mb-3 flex gap-1 text-xs">
          <button
            onClick={() => setModo('temas')}
            className={'px-3 py-1.5 rounded-l border ' + (modo === 'temas'
              ? 'bg-[#2563eb] border-[#2563eb] text-white'
              : 'border-[#30363d] text-[#8b949e]')}
          >Temes predefinits</button>
          <button
            onClick={() => setModo('libre')}
            className={'px-3 py-1.5 rounded-r border ' + (modo === 'libre'
              ? 'bg-[#2563eb] border-[#2563eb] text-white'
              : 'border-[#30363d] text-[#8b949e]')}
          >Consulta lliure</button>
        </div>

        {modo === 'temas' ? (
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
        ) : (
          <div className="mb-3">
            <p className="text-xs text-[#8b949e] mb-2">
              Descriu què vols vigilar en llenguatge natural. La IA traduirà la teva consulta
              a cerques sobre actes, votacions, Parlament i xarxes socials.
            </p>
            <textarea
              value={promptLibre}
              onChange={(e) => setPromptLibre(e.target.value)}
              rows={3}
              placeholder="Ex: Tot el que es parli d'Aliança Catalana, o moviments del PP a municipis on governem..."
              className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm resize-y"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {EJEMPLOS_LIBRE.map((ej) => (
                <button
                  key={ej}
                  onClick={() => setPromptLibre(ej)}
                  className="text-[11px] text-[#8b949e] hover:text-[#2563eb] border border-[#30363d] hover:border-[#2563eb] rounded px-2 py-1"
                >
                  {ej.length > 50 ? ej.slice(0, 50) + '…' : ej}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-[#8b949e] mb-1">Canal</label>
            <select value={canal} onChange={(e) => setCanal(e.target.value as 'email' | 'telegram' | 'both')}
                    className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm">
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="both">Tots dos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8b949e] mb-1">Finestra temporal</label>
            <select value={ventanaDias} onChange={(e) => setVentanaDias(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm">
              <option value={7}>Darrers 7 dies</option>
              <option value={14}>Darrers 14 dies</option>
              <option value={30}>Darrers 30 dies</option>
              <option value={90}>Darrers 90 dies</option>
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-[#8b949e] mb-1">Quan s&apos;enviarà</label>
          <CronPicker value={cron} onChange={setCron} />
        </div>
        <button onClick={create} disabled={!canCreate}
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
                {s.prompt_libre
                  ? <span className="italic">&ldquo;{s.prompt_libre.slice(0, 90)}{s.prompt_libre.length > 90 ? '…' : ''}&rdquo;</span>
                  : s.temas.join(', ')}
                {' · '}{s.canal} · <code>{s.cron_expr}</code>
                {s.last_sent_at && ` · últim enviament ${s.last_sent_at.slice(0, 16)}`}
              </p>
            </div>
            <button onClick={() => showPreview(s.id)} className="text-xs text-[#2563eb] hover:underline">Previsualitza</button>
            <button onClick={() => remove(s.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
          </div>
        ))}
      </div>

      {preview.open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={() => !preview.loading && setPreview({ open: false, loading: false, brief: null })}
        >
          <div
            className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#30363d]">
              <h3 className="text-sm font-semibold text-[#e6edf3]">Previsualització del brief</h3>
              {!preview.loading && (
                <button
                  onClick={() => setPreview({ open: false, loading: false, brief: null })}
                  className="text-xs text-[#8b949e] hover:text-[#e6edf3]"
                >Tancar</button>
              )}
            </div>

            {preview.loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
                <p className="text-sm text-[#8b949e]">Generant brief...</p>
                <p className="text-xs text-[#6e7681]">
                  Recopilant dades, consultant la IA. Pot trigar 10-30 segons.
                </p>
              </div>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {preview.brief || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
