'use client';

import { useState, useEffect } from 'react';
import {
  X, Bell, Tag, Users, MessageSquare, Building2, Save, Loader2,
  AlertTriangle, AlertCircle, Info, Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/ApiClient';
import type { AlertaRegla, AlertaReglaIn, AlertSeverity } from '@/lib/types';
import { TagsInput } from './TagsInput';
import { cn } from '@/lib/utils';

const TEMAS_SUGERIDOS = [
  'urbanismo', 'hacienda', 'seguridad', 'medio_ambiente', 'cultura',
  'transporte', 'servicios_sociales', 'vivienda', 'educacion', 'salud',
  'comercio', 'mociones', 'inmigración', 'civismo',
];

const PARTIDOS_SUGERIDOS = [
  'AC', 'JxCat', 'ERC', 'PSC', 'CUP', 'PP', 'VOX', 'Cs', 'Comuns',
];

const SEV_META: Record<AlertSeverity, { label: string; icon: typeof AlertTriangle; bg: string; border: string; text: string }> = {
  alta:  { label: 'Alta', icon: AlertTriangle, bg: 'bg-[#2a0a0a]', border: 'border-[#dc2626]/40', text: 'text-[#f87171]' },
  media: { label: 'Mitja', icon: AlertCircle, bg: 'bg-[#2a1f08]', border: 'border-[#d97706]/40', text: 'text-[#fbbf24]' },
  baja:  { label: 'Baixa', icon: Info,        bg: 'bg-[#052e16]', border: 'border-[#16a34a]/40', text: 'text-[#4ade80]' },
};

interface Props {
  open: boolean;
  initial?: AlertaRegla | null;
  onClose: () => void;
  onSaved: (regla: AlertaRegla) => void;
}

export function ReglaFormModal({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<AlertaReglaIn>({
    nombre: '',
    descripcion: '',
    partidos: [],
    temas: [],
    concejales: [],
    palabras_clave: [],
    municipios: [],
    fuentes: ['argumentos', 'puntos'],
    severidad: 'media',
    canal: 'web',
    min_coincidencias: 1,
    activa: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.nombre,
        descripcion: initial.descripcion || '',
        partidos: initial.partidos || [],
        temas: initial.temas || [],
        concejales: initial.concejales || [],
        palabras_clave: initial.palabras_clave || [],
        municipios: initial.municipios || [],
        fuentes: initial.fuentes || ['argumentos', 'puntos'],
        severidad: initial.severidad,
        canal: initial.canal,
        min_coincidencias: initial.min_coincidencias,
        activa: initial.activa,
      });
    } else {
      setForm({
        nombre: '', descripcion: '',
        partidos: [], temas: [], concejales: [], palabras_clave: [], municipios: [],
        fuentes: ['argumentos', 'puntos'],
        severidad: 'media', canal: 'web', min_coincidencias: 1, activa: true,
      });
    }
    setError(null);
    setTestResult(null);
  }, [initial, open]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose, saving]);

  const save = async () => {
    setError(null);
    if (!form.nombre.trim()) { setError("Falta el nom"); return; }
    const hasAnyFilter = (form.partidos?.length || 0) + (form.temas?.length || 0) +
                        (form.concejales?.length || 0) + (form.palabras_clave?.length || 0);
    if (hasAnyFilter === 0) {
      setError("Indica almenys un filtre (partit, tema, regidor o paraula clau)");
      return;
    }

    setSaving(true);
    try {
      const saved = initial
        ? await apiClient.put<AlertaRegla>(`/api/alertas/reglas/${initial.id}`, form)
        : await apiClient.post<AlertaRegla>(`/api/alertas/reglas/`, form);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const testNow = async () => {
    if (!initial) { setError("Guarda primer la regla per testejar-la"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await apiClient.post<{ ok: boolean; matches: number }>(
        `/api/alertas/reglas/${initial.id}/run`, {},
      );
      setTestResult(`✓ ${r.matches} alertes noves generades`);
    } catch {
      setTestResult('✗ Error al executar la regla');
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-[#30363d] bg-gradient-to-br from-[#0f141b] to-[#161b22] shadow-[0_0_60px_-10px_rgba(124,58,237,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#21262d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border border-[#7c3aed]/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#c4b5fd]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">
                {initial ? 'Editar regla d\'alerta' : 'Nova regla d\'alerta'}
              </h2>
              <p className="text-[11px] text-[#8b949e]">
                Vigila combinacions de partit, tema, regidors o paraules clau
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58] flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-140px)] p-5 space-y-4">
          {/* Nom + descripció */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
              Nom <span className="text-[#f87171]">*</span>
            </label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ex: Vigilància PP sobre civisme"
              className="w-full px-3 py-2 rounded-lg border border-[#30363d] bg-[#0d1117] text-[13px] text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none focus:border-[#7c3aed]/60 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
              Descripció (opcional)
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Per què serveix aquesta regla?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#30363d] bg-[#0d1117] text-[13px] text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none focus:border-[#7c3aed]/60 transition-colors resize-none"
            />
          </div>

          {/* Filtres */}
          <div className="rounded-xl border border-[#21262d] bg-[#0d1117] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#c4b5fd]" />
              <h3 className="text-[11px] font-semibold text-[#c4b5fd] uppercase tracking-wider">
                Filtres (combina els que vulguis)
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#c9d1d9]">
                <Tag className="w-3 h-3 text-[#f87171]" />
                Partits
              </label>
              <TagsInput
                value={form.partidos || []}
                onChange={(v) => setForm({ ...form, partidos: v })}
                placeholder="Ex: PP, PSC… (Enter per afegir)"
                suggestions={PARTIDOS_SUGERIDOS}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#c9d1d9]">
                <Tag className="w-3 h-3 text-[#fbbf24]" />
                Temes
              </label>
              <TagsInput
                value={form.temas || []}
                onChange={(v) => setForm({ ...form, temas: v })}
                placeholder="Ex: seguridad, vivienda…"
                suggestions={TEMAS_SUGERIDOS}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#c9d1d9]">
                <Users className="w-3 h-3 text-[#93c5fd]" />
                Regidors (nom o cognom)
              </label>
              <TagsInput
                value={form.concejales || []}
                onChange={(v) => setForm({ ...form, concejales: v })}
                placeholder="Ex: Orriols, Julio Ordóñez…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#c9d1d9]">
                <MessageSquare className="w-3 h-3 text-[#c4b5fd]" />
                Paraules clau
              </label>
              <TagsInput
                value={form.palabras_clave || []}
                onChange={(v) => setForm({ ...form, palabras_clave: v })}
                placeholder="Ex: nepotisme, títol fals, corrupció…"
              />
            </div>
          </div>

          {/* Configuració */}
          <div className="rounded-xl border border-[#21262d] bg-[#0d1117] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#fbbf24]" />
              <h3 className="text-[11px] font-semibold text-[#fbbf24] uppercase tracking-wider">
                Configuració
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#c9d1d9]">Severitat</label>
              <div className="flex gap-2">
                {(['alta', 'media', 'baja'] as AlertSeverity[]).map((s) => {
                  const m = SEV_META[s];
                  const Icon = m.icon;
                  const active = form.severidad === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, severidad: s })}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all',
                        active ? `${m.bg} ${m.border} ${m.text}` : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]',
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[11px] text-[#c9d1d9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                  className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117]"
                />
                Activa
              </label>
              <span className="text-[10px] text-[#6e7681]">
                S'avalua cada 30 minuts automàticament
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-[#2a0a0a] border border-[#dc2626]/40 p-3 text-[12px] text-[#fca5a5]">
              {error}
            </div>
          )}
          {testResult && (
            <div className="rounded-lg bg-[#052e16] border border-[#16a34a]/40 p-3 text-[12px] text-[#86efac]">
              {testResult}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#21262d] bg-[#0a0d12]/80 flex items-center justify-between gap-2">
          <div>
            {initial && (
              <button
                onClick={testNow}
                disabled={testing || saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg border border-[#30363d] text-[#c9d1d9] hover:border-[#484f58] hover:text-[#e6edf3] transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Executar ara
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 text-[11px] rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              Cancel·lar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px] rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white hover:from-[#8b5cf6] hover:to-[#22d3ee] transition-colors disabled:opacity-50 shadow-lg shadow-[#7c3aed]/20"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {initial ? 'Desar canvis' : 'Crear regla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
