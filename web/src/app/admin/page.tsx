'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, Loader2 } from 'lucide-react';
import apiClient from '@/lib/ApiClient';

type User = {
  user_id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  anonimizar_nombres: boolean;
  areas: string[];
  municipio_ids: number[];
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

type Municipio = { id: number; nombre: string; comarca: string };

const TABS = ['Resum', 'Usuaris', 'Audit log'] as const;
const ROLES = ['admin', 'direccion', 'delegado', 'concejal'] as const;
const AREAS = [
  'medio_ambiente', 'comercio', 'pesca', 'agricultura', 'caza',
  'urbanismo', 'seguridad', 'servicios_sociales', 'vivienda',
  'educacion', 'salud', 'transporte', 'cultura', 'mociones',
];

type FormState = {
  user_id?: string;
  email: string;
  password: string;
  nombre: string;
  rol: string;
  activo: boolean;
  anonimizar_nombres: boolean;
  areas: string[];
  municipio_ids: number[];
};

const emptyForm: FormState = {
  email: '', password: '', nombre: '', rol: 'delegado',
  activo: true, anonimizar_nombres: false, areas: [], municipio_ids: [],
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  background: 'var(--bg-elevated)', border: '.5px solid var(--border-em)',
  borderRadius: 'var(--r-md)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-meta)', marginBottom: 4,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px', fontSize: 10, color: 'var(--text-meta)',
  letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 500, fontFamily: 'var(--font-mono)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, borderTop: '.5px solid var(--border)', color: 'var(--text-primary)',
};

export default function AdministracioPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resum');
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [municipioSearch, setMunicipioSearch] = useState('');
  const [municipioResults, setMunicipioResults] = useState<Municipio[]>([]);
  const [municipiosSelected, setMunicipiosSelected] = useState<Municipio[]>([]);

  function loadAll() {
    apiClient.get<User[]>('/api/admin/users').then(setUsers).catch((e) => setError(e.message));
    apiClient.get<UsageRow[]>('/api/admin/usage?limit=200').then(setUsage).catch(() => {});
    apiClient.get<Summary[]>('/api/admin/usage/summary').then(setSummary).catch(() => {});
  }
  useEffect(loadAll, []);

  useEffect(() => {
    if (modalMode === 'closed') return;
    const q = municipioSearch.trim();
    if (q.length < 2) { setMunicipioResults([]); return; }
    const t = setTimeout(() => {
      apiClient.get<Municipio[]>(`/api/admin/municipios?q=${encodeURIComponent(q)}&limit=20`)
        .then(setMunicipioResults).catch(() => setMunicipioResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [municipioSearch, modalMode]);

  function openCreate() {
    setForm({ ...emptyForm }); setMunicipiosSelected([]); setMunicipioSearch('');
    setModalMode('create'); setError(null);
  }

  async function openEdit(u: User) {
    setForm({ user_id: u.user_id, email: '', password: '', nombre: u.nombre, rol: u.rol, activo: u.activo, anonimizar_nombres: u.anonimizar_nombres, areas: u.areas, municipio_ids: u.municipio_ids });
    setMunicipioSearch('');
    if (u.municipio_ids.length > 0) {
      try {
        const all = await apiClient.get<Municipio[]>(`/api/admin/municipios?limit=200`);
        setMunicipiosSelected(all.filter((m) => u.municipio_ids.includes(m.id)));
      } catch { setMunicipiosSelected([]); }
    } else { setMunicipiosSelected([]); }
    setModalMode('edit'); setError(null);
  }

  function closeModal() { if (saving) return; setModalMode('closed'); setError(null); }
  function toggleArea(a: string) { setForm((f) => ({ ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a] })); }
  function addMunicipio(m: Municipio) {
    if (form.municipio_ids.includes(m.id)) return;
    setMunicipiosSelected((s) => [...s, m]);
    setForm((f) => ({ ...f, municipio_ids: [...f.municipio_ids, m.id] }));
    setMunicipioSearch(''); setMunicipioResults([]);
  }
  function removeMunicipio(id: number) {
    setMunicipiosSelected((s) => s.filter((m) => m.id !== id));
    setForm((f) => ({ ...f, municipio_ids: f.municipio_ids.filter((x) => x !== id) }));
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      if (modalMode === 'create') {
        if (!form.email || !form.password || form.password.length < 6 || !form.nombre)
          throw new Error('Email, password (≥6 chars) i nom són obligatoris');
        await apiClient.post('/api/admin/users', { email: form.email, password: form.password, nombre: form.nombre, rol: form.rol, activo: form.activo, anonimizar_nombres: form.anonimizar_nombres, areas: form.areas, municipio_ids: form.municipio_ids });
      } else if (modalMode === 'edit' && form.user_id) {
        await apiClient.put(`/api/admin/users/${form.user_id}`, { nombre: form.nombre, rol: form.rol, activo: form.activo, anonimizar_nombres: form.anonimizar_nombres, areas: form.areas, municipio_ids: form.municipio_ids });
      }
      setModalMode('closed'); loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  }

  async function removeUser(u: User) {
    if (!confirm(`Eliminar usuari "${u.nombre}"? Aquesta acció és irreversible.`)) return;
    try { await apiClient.delete(`/api/admin/users/${u.user_id}`); loadAll(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>Panell d&apos;administració</h1>
          <p style={{ fontSize: 13, color: 'var(--text-meta)', margin: 0 }}>Gestió d&apos;usuaris, monitorització d&apos;ús i auditoria.</p>
        </div>
        {tab === 'Usuaris' && (
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand)', color: '#E8F1F9', border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Plus style={{ width: 14, height: 14 }} /> Nou usuari
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(220,38,38,.08)', border: '.5px solid rgba(220,38,38,.3)', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, borderBottom: '.5px solid var(--border)', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', fontSize: 13, background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid var(--brand-l)' : '2px solid transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-meta)', cursor: 'pointer', marginBottom: -1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resum' && (
        <div style={{ border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Usuari', 'Rol', 'Total 30d', 'Chat', 'Cerca', 'Última activitat'].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i >= 2 && i <= 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.user_id}>
                  <td style={tdStyle}>{s.nombre}</td>
                  <td style={tdStyle}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-secondary)' }}>{s.rol}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.total}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.queries_chat}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.queries_search}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-meta)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.last_activity?.slice(0, 16) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Usuaris' && (
        <div style={{ border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nom', 'Rol', 'Àrees', 'Municipis', 'Anon.', 'Estat', 'Accions'].map(h => (
                  <th key={h} style={{ ...thStyle, textAlign: h === 'Municipis' || h === 'Accions' ? 'right' : h === 'Anon.' ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{u.nombre}</td>
                  <td style={tdStyle}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-secondary)' }}>{u.rol}</span></td>
                  <td style={{ ...tdStyle, color: 'var(--text-meta)', fontSize: 11 }}>{u.areas.join(', ') || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{u.n_municipios}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{u.anonimizar_nombres ? '🛡️' : '—'}</td>
                  <td style={tdStyle}>{u.activo ? '🟢 actiu' : '🔴 inactiu'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button onClick={() => openEdit(u)} title="Editar" style={{ padding: '4px 6px', background: 'transparent', border: '.5px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-meta)', cursor: 'pointer' }}>
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button onClick={() => removeUser(u)} title="Eliminar" style={{ padding: '4px 6px', background: 'transparent', border: '.5px solid rgba(220,38,38,.3)', borderRadius: 'var(--r-md)', color: '#dc2626', cursor: 'pointer' }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-meta)', padding: '32px' }}>
                  Sense usuaris encara. Clica &quot;Nou usuari&quot;.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Audit log' && (
        <div style={{ border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Quan', 'Usuari', 'Acció', 'Detall'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle, color: 'var(--text-meta)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{u.created_at.slice(0, 19).replace('T', ' ')}</td>
                  <td style={tdStyle}>{u.user_nombre ?? '—'}</td>
                  <td style={tdStyle}>{u.accion}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-meta)' }}>
                    {u.payload ? <code style={{ fontSize: 11 }}>{JSON.stringify(u.payload).slice(0, 120)}</code> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalMode !== 'closed' && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '.5px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                {modalMode === 'create' ? 'Nou usuari' : `Editar: ${form.nombre}`}
              </h3>
              <button onClick={closeModal} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-meta)', opacity: saving ? 0.5 : 1 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {modalMode === 'create' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contrasenya * (≥6 chars)</label>
                    <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Rol</label>
                  <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} style={inputStyle}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                  Actiu
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)' }} title="Oculta noms de persones particulars">
                  <input type="checkbox" checked={form.anonimizar_nombres} onChange={(e) => setForm({ ...form, anonimizar_nombres: e.target.checked })} />
                  Anonimitzar noms (RGPD)
                </label>
              </div>

              <div>
                <label style={labelStyle}>Àrees assignades (deixa buit per accés total)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AREAS.map((a) => (
                    <button key={a} type="button" onClick={() => toggleArea(a)} style={{
                      padding: '3px 10px', fontSize: 11, borderRadius: 'var(--r-full)', cursor: 'pointer',
                      background: form.areas.includes(a) ? 'var(--brand)' : 'transparent',
                      border: `.5px solid ${form.areas.includes(a) ? 'var(--brand)' : 'var(--border)'}`,
                      color: form.areas.includes(a) ? '#E8F1F9' : 'var(--text-meta)',
                    }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Municipis assignats (deixa buit per accés total)</label>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search style={{ width: 13, height: 13, position: 'absolute', left: 10, top: 10, color: 'var(--text-meta)' }} />
                  <input value={municipioSearch} onChange={(e) => setMunicipioSearch(e.target.value)} placeholder="Cerca municipi..." style={{ ...inputStyle, paddingLeft: 28 }} />
                  {municipioResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', marginTop: 4, left: 0, right: 0, background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 'var(--r-md)', maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                      {municipioResults.map((m) => (
                        <button key={m.id} type="button" onClick={() => addMunicipio(m)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                          <span>{m.nombre}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-meta)' }}>{m.comarca}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {municipiosSelected.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {municipiosSelected.map((m) => (
                      <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {m.nombre}
                        <button onClick={() => removeMunicipio(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex' }}>
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '.5px solid var(--border)' }}>
              <button onClick={closeModal} disabled={saving} style={{ padding: '8px 14px', background: 'transparent', border: '.5px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-meta)', fontSize: 13, cursor: 'pointer' }}>
                Cancel·lar
              </button>
              <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand)', color: '#E8F1F9', border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
                {modalMode === 'create' ? 'Crear' : 'Desar canvis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
