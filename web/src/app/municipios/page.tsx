'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Filter,
  FileText,
  Users,
  ChevronRight,
  Loader2,
  Building2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { apiClient } from '@/lib/ApiClient';
import type { Municipio } from '@/lib/types';
import { cn } from '@/lib/utils';
import { HelpBanner } from '@/components/warroom/HelpBanner';

const PROVINCIAS = ['Totes', 'Barcelona', 'Girona', 'Lleida', 'Tarragona'];

export default function MunicipiosPage() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [provincia, setProvincia] = useState('Totes');
  const [tieneAC, setTieneAC] = useState<boolean | null>(null);

  useEffect(() => {
    const loadMunicipios = async () => {
      try {
        const params = new URLSearchParams();
        if (provincia !== 'Totes') params.set('provincia', provincia);
        if (tieneAC !== null) params.set('tiene_ac', String(tieneAC));

        const data = await apiClient.get<any>(
          `/api/municipios/?${params.toString()}&limit=200`,
        );
        setMunicipios(Array.isArray(data) ? data : data.results || []);
      } catch {
        setError('No s\'ha pogut carregar la llista de municipis.');
      } finally {
        setLoading(false);
      }
    };

    loadMunicipios();
  }, [provincia, tieneAC]);

  const filtered = useMemo(() => {
    if (!search.trim()) return municipios;
    const q = search.toLowerCase();
    return municipios.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.comarca.toLowerCase().includes(q),
    );
  }, [municipios, search]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>Operacions / Municipis</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1, margin: 0, letterSpacing: '-.02em', fontWeight: 400, color: 'var(--paper)' }}>
          Municipis <em style={{ color: 'var(--wr-phosphor)' }}>monitorats.</em>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', marginTop: 8, letterSpacing: '.06em' }}>
          {municipios.length > 0 ? `${municipios.length} municipis · Catalunya` : 'Catalunya'}
        </p>
      </div>
      <HelpBanner
        pageKey="municipios"
        title="Municipis de Catalunya"
        description="Directori dels 947 municipis monitorats. Consulta l'activitat de qualsevol ajuntament: últims plens, composició del ple, temes debatuts i alertes actives. Filtra per presència d'AC o per activitat recent."
        dataSource="947 municipis · dades de dadesobertes.gencat.cat"
        tips={[
          "Usa el filtre 'Amb presència AC' per veure on tenim regidors",
          "Clica un municipi per veure'n el detall complet",
          "Dins la fitxa del municipi pots obrir un chat contextual per preguntar sobre aquell municipi",
        ]}
      />
      {/* Sub-nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'tots', label: 'Tots els municipis' },
          { id: 'ac', label: 'Amb presència AC' },
          { id: 'recent', label: 'Per activitat recent' },
        ].map(t => (
          <button key={t.id} onClick={() => {
            if (t.id === 'ac') setSearch('AC');
            else if (t.id === 'recent') { setSearch(''); setSort('recent'); }
            else { setSearch(''); }
          }} style={{
            padding: '10px 16px', background: 'transparent',
            border: 'none', borderBottom: '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 26px' }} className="space-y-6">

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cercar per nom o comarca..."
          className="w-72"
        />

        <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
          {PROVINCIAS.map((p) => (
            <button
              key={p}
              onClick={() => setProvincia(p)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                provincia === p
                  ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
                  : 'text-[#8b949e] hover:text-[#e6edf3]',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
          <button
            onClick={() => setTieneAC(null)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              tieneAC === null
                ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
                : 'text-[#8b949e] hover:text-[#e6edf3]',
            )}
          >
            Tots
          </button>
          <button
            onClick={() => setTieneAC(true)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              tieneAC === true
                ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
                : 'text-[#8b949e] hover:text-[#e6edf3]',
            )}
          >
            Amb AC
          </button>
          <button
            onClick={() => setTieneAC(false)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              tieneAC === false
                ? 'bg-[#1c2128] text-[#e6edf3] font-medium'
                : 'text-[#8b949e] hover:text-[#e6edf3]',
            )}
          >
            Sense AC
          </button>
        </div>

        {filtered.length !== municipios.length && (
          <span className="text-xs text-[#8b949e] ml-auto">
            Mostrant {filtered.length} de {municipios.length}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#450a0a] border border-[#7f1d1d]">
          <AlertCircle className="w-4 h-4 text-[#f87171] flex-shrink-0" />
          <p className="text-sm text-[#f87171]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" />
          <span className="ml-2 text-sm text-[#8b949e]">
            Carregant municipis...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-[#161b22] border border-[#30363d] rounded-lg">
          <Building2 className="w-10 h-10 text-[#6e7681] mb-3" />
          <p className="text-sm font-medium text-[#8b949e]">
            Cap municipi trobat
          </p>
          <p className="text-xs text-[#6e7681] mt-1">
            Intenta canviar els filtres de cerca
          </p>
        </div>
      )}

      {/* Municipalities grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((municipio) => (
            <MunicipioCard key={municipio.id} municipio={municipio} />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

function MunicipioCard({ municipio }: { municipio: Municipio }) {
  return (
    <Link
      href={`/municipios/${municipio.id}`}
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#484f58] hover:bg-[#1c2128] transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#e6edf3] group-hover:text-[#60a5fa] transition-colors truncate">
            {municipio.nombre}
          </h3>
          <p className="text-xs text-[#8b949e] mt-0.5 truncate">
            {municipio.comarca} · {municipio.provincia}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#6e7681] flex-shrink-0 ml-2 group-hover:text-[#60a5fa] transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#8b949e]">
          <FileText className="w-3.5 h-3.5 text-[#6e7681]" />
          <span>{municipio.actas_procesadas} actes</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#8b949e]">
          <Users className="w-3.5 h-3.5 text-[#6e7681]" />
          <span>{municipio.num_concejales} concejals</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#8b949e]">
          <MapPin className="w-3.5 h-3.5 text-[#6e7681]" />
          <span>
            {(municipio.poblacion || 0).toLocaleString('ca-ES')} hab.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {municipio.tiene_ac ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border border-[#30363d] inline-block" />
          )}
          <span
            className={municipio.tiene_ac ? 'text-[#4ade80]' : 'text-[#6e7681]'}
          >
            {municipio.tiene_ac ? 'Té AC' : 'Sense AC'}
          </span>
        </div>
      </div>

      {municipio.ultima_acta && (
        <div className="mt-3 pt-3 border-t border-[#21262d]">
          <p className="text-[10px] text-[#6e7681]">
            Última acta:{' '}
            <span className="text-[#8b949e]">{municipio.ultima_acta}</span>
          </p>
        </div>
      )}
    </Link>
  );
}
