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

        const data = await apiClient.get<Municipio[]>(
          `/api/municipios/?${params.toString()}`,
        );
        setMunicipios(data);
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Municipis</h1>
        <p className="text-sm text-[#8b949e] mt-0.5">
          {municipios.length > 0
            ? `${municipios.length} municipis monitorats a Catalunya`
            : 'Municipis monitorats a Catalunya'}
        </p>
      </div>

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
            {municipio.poblacion.toLocaleString('ca-ES')} hab.
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
