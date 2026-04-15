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
  email: '',
  password: '',
  nombre: '',
  rol: 'delegado',
  activo: true,
  anonimizar_nombres: false,
  areas: [],
  municipio_ids: [],
};

export default function AdminPage() {
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

  // Búsqueda municipios
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
    setForm({ ...emptyForm });
    setMunicipiosSelected([]);
    setMunicipioSearch('');
    setModalMode('create');
    setError(null);
  }

  async function openEdit(u: User) {
    setForm({
      user_id: u.user_id,
      email: '',
      password: '',
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
      anonimizar_nombres: u.anonimizar_nombres,
      areas: u.areas,
      municipio_ids: u.municipio_ids,
    });
    setMunicipioSearch('');
    // Cargar nombres de los municipios ya asignados
    if (u.municipio_ids.length > 0) {
      try {
        const all = await apiClient.get<Municipio[]>(`/api/admin/municipios?limit=200`);
        setMunicipiosSelected(all.filter((m) => u.municipio_ids.includes(m.id)));
      } catch {
        setMunicipiosSelected([]);
      }
    } else {
      setMunicipiosSelected([]);
    }
    setModalMode('edit');
    setError(null);
  }

  function closeModal() {
    if (saving) return;
    setModalMode('closed');
    setError(null);
  }

  function toggleArea(a: string) {
    setForm((f) => ({
      ...f,
      areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a],
    }));
  }

  function addMunicipio(m: Municipio) {
    if (form.municipio_ids.includes(m.id)) return;
    setMunicipiosSelected((s) => [...s, m]);
    setForm((f) => ({ ...f, municipio_ids: [...f.municipio_ids, m.id] }));
    setMunicipioSearch('');
    setMunicipioResults([]);
  }
  function removeMunicipio(id: number) {
    setMunicipiosSelected((s) => s.filter((m) => m.id !== id));
    setForm((f) => ({ ...f, municipio_ids: f.municipio_ids.filter((x) => x !== id) }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'create') {
        if (!form.email || !form.password || form.password.length < 6 || !form.nombre) {
          throw new Error('Email, password (≥6 chars) i nom són obligatoris');
        }
        await apiClient.post('/api/admin/users', {
          email: form.email,
          password: form.password,
          nombre: form.nombre,
          rol: form.rol,
          activo: form.activo,
          anonimizar_nombres: form.anonimizar_nombres,
          areas: form.areas,
          municipio_ids: form.municipio_ids,
        });
      } else if (modalMode === 'edit' && form.user_id) {
        await apiClient.put(`/api/admin/users/${form.user_id}`, {
          nombre: form.nombre,
          rol: form.rol,
          activo: form.activo,
          anonimizar_nombres: form.anonimizar_nombres,
          areas: form.areas,
          municipio_ids: form.municipio_ids,
        });
      }
      setModalMode('closed');
      loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(u: User) {
    if (!confirm(`Eliminar usuari "${u.nombre}"? Aquesta acció és irreversible.`)) return;
    try {
      await apiClient.delete(`/api/admin/users/${u.user_id}`);
      loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Panell d&apos;administració</h1>
          <p className="text-sm text-[#8b949e]">Gestió d&apos;usuaris, monitorització d&apos;ús i auditoria.</p>
        </div>
        {tab === 'Usuaris' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-2 rounded text-sm"
          >
            <Plus className="w-4 h-4" /> Nou usuari
          </button>
        )}
      </div>

      {error && (
        <div className="bg-[#450a0a] border border-[#7f1d1d] text-red-300 text-sm rounded p-3 mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex gap-4 border-b border-[#30363d] mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={'px-3 py-2 text-sm border-b-2 -mb-px ' +
                    (tab === t ? 'border-[#2563eb] text-white' : 'border-transparent text-[#8b949e]')}>
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
              <th className="text-center">Anonimitzar</th>
              <th className="text-left">Estat</th>
              <th className="text-right pr-2">Accions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-t border-[#21262d] hover:bg-[#161b22]">
                <td className="py-2 font-medium">{u.nombre}</td>
                <td>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#1c2128] border border-[#30363d]">{u.rol}</span>
                </td>
                <td className="text-[#8b949e] text-xs">{u.areas.join(', ') || '—'}</td>
                <td className="text-right">{u.n_municipios}</td>
                <td className="text-center">{u.anonimizar_nombres ? '🛡️' : '—'}</td>
                <td>{u.activo ? '🟢 actiu' : '🔴 inactiu'}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded hover:bg-[#1c2128] text-[#8b949e] hover:text-[#e6edf3]"
                            title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeUser(u)}
                            className="p-1.5 rounded hover:bg-[#450a0a] text-[#8b949e] hover:text-red-400"
                            title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-[#8b949e]">
                Sense usuaris encara. Clica &quot;Nou usuari&quot;.
              </td></tr>
            )}
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

      {/* ------ MODAL CREAR / EDITAR ------ */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
             onClick={closeModal}>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
              <h3 className="text-sm font-semibold">
                {modalMode === 'create' ? 'Nou usuari' : `Editar: ${form.nombre}`}
              </h3>
              <button onClick={closeModal} disabled={saving}
                      className="text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modalMode === 'create' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#8b949e] mb-1">Email *</label>
                    <input type="email" value={form.email}
                           onChange={(e) => setForm({ ...form, email: e.target.value })}
                           className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8b949e] mb-1">Contrasenya * (≥6 chars)</label>
                    <input type="text" value={form.password}
                           onChange={(e) => setForm({ ...form, password: e.target.value })}
                           className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm font-mono" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8b949e] mb-1">Nom *</label>
                  <input value={form.nombre}
                         onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                         className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[#8b949e] mb-1">Rol</label>
                  <select value={form.rol}
                          onChange={(e) => setForm({ ...form, rol: e.target.value })}
                          className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.activo}
                         onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                  Actiu
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Oculta noms de persones particulars (cargos electos mantenen nom)">
                  <input type="checkbox" checked={form.anonimizar_nombres}
                         onChange={(e) => setForm({ ...form, anonimizar_nombres: e.target.checked })} />
                  Anonimitzar noms (RGPD)
                </label>
              </div>

              <div>
                <label className="block text-xs text-[#8b949e] mb-2">Àrees assignades (deixa buit per accés total)</label>
                <div className="flex flex-wrap gap-1.5">
                  {AREAS.map((a) => (
                    <button key={a} type="button" onClick={() => toggleArea(a)}
                            className={'px-2.5 py-1 rounded-full text-xs border ' +
                              (form.areas.includes(a)
                                ? 'bg-[#2563eb] border-[#2563eb] text-white'
                                : 'border-[#30363d] text-[#8b949e] hover:border-[#484f58]')}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8b949e] mb-2">
                  Municipis assignats (deixa buit per accés total)
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6e7681]" />
                  <input value={municipioSearch}
                         onChange={(e) => setMunicipioSearch(e.target.value)}
                         placeholder="Cerca municipi..."
                         className="w-full pl-8 pr-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm" />
                  {municipioResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[#0d1117] border border-[#30363d] rounded max-h-48 overflow-y-auto z-10">
                      {municipioResults.map((m) => (
                        <button key={m.id} type="button" onClick={() => addMunicipio(m)}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#161b22] flex justify-between">
                          <span>{m.nombre}</span>
                          <span className="text-xs text-[#6e7681]">{m.comarca}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {municipiosSelected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {municipiosSelected.map((m) => (
                      <span key={m.id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c2128] border border-[#30363d] text-xs">
                        {m.nombre}
                        <button onClick={() => removeMunicipio(m.id)} className="hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-[#30363d]">
              <button onClick={closeModal} disabled={saving}
                      className="px-3 py-2 rounded text-sm text-[#8b949e] hover:text-[#e6edf3]">
                Cancel·lar
              </button>
              <button onClick={save} disabled={saving}
                      className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white px-4 py-2 rounded text-sm">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {modalMode === 'create' ? 'Crear' : 'Desar canvis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
