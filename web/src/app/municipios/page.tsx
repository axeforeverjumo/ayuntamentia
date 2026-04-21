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

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cercar per nom o comarca..."
          className="w-72"
        />

        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 4, gap: 2 }}>
          {PROVINCIAS.map((p) => (
            <button
              key={p}
              onClick={() => setProvincia(p)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--r-md)', fontSize: 11,
                fontWeight: provincia === p ? 500 : 400, border: 'none', cursor: 'pointer',
                background: provincia === p ? 'var(--brand)' : 'transparent',
                color: provincia === p ? '#E8F1F9' : 'var(--text-secondary)',
                transition: 'all .15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 4, gap: 2 }}>
          {[{ v: null, l: 'Tots' }, { v: true, l: 'Amb AC' }, { v: false, l: 'Sense AC' }].map(({ v, l }) => (
            <button
              key={String(v)}
              onClick={() => setTieneAC(v as boolean | null)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--r-md)', fontSize: 11,
                fontWeight: tieneAC === v ? 500 : 400, border: 'none', cursor: 'pointer',
                background: tieneAC === v ? 'var(--brand)' : 'transparent',
                color: tieneAC === v ? '#E8F1F9' : 'var(--text-secondary)',
                transition: 'all .15s',
              }}
            >{l}</button>
          ))}
        </div>

        {filtered.length !== municipios.length && (
          <span style={{ fontSize: 11, color: 'var(--text-meta)', marginLeft: 'auto' }}>
            Mostrant {filtered.length} de {municipios.length}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--r-lg)', background: 'rgba(220,38,38,.08)', border: '.5px solid rgba(220,38,38,.3)' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 style={{ width: 20, height: 20, color: 'var(--brand)' }} className="animate-spin" />
          <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-meta)' }}>
            Carregant municipis...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
          <Building2 style={{ width: 40, height: 40, color: 'var(--text-meta)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            Cap municipi trobat
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-meta)', margin: 0 }}>
            Intenta canviar els filtres de cerca
          </p>
        </div>
      )}

      {/* Municipalities grid */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
      style={{
        display: 'block', background: 'var(--bg-surface)', border: '.5px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: 16, textDecoration: 'none', transition: 'border-color .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {municipio.nombre}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-meta)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {municipio.comarca} · {municipio.provincia}
          </p>
        </div>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-meta)', flexShrink: 0, marginLeft: 8 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <FileText style={{ width: 12, height: 12, color: 'var(--text-meta)' }} />
          <span>{municipio.actas_procesadas} actes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <Users style={{ width: 12, height: 12, color: 'var(--text-meta)' }} />
          <span>{municipio.num_concejales} concejals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <MapPin style={{ width: 12, height: 12, color: 'var(--text-meta)' }} />
          <span>{(municipio.poblacion || 0).toLocaleString('ca-ES')} hab.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          {municipio.tiene_ac ? (
            <CheckCircle2 style={{ width: 12, height: 12, color: '#16a34a' }} />
          ) : (
            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '.5px solid var(--border)', display: 'inline-block' }} />
          )}
          <span style={{ color: municipio.tiene_ac ? '#16a34a' : 'var(--text-meta)' }}>
            {municipio.tiene_ac ? 'Té AC' : 'Sense AC'}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '.5px solid var(--border)' }}>
        {municipio.ultima_acta ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-meta)', margin: 0 }}>
            Últim ple: fa {Math.floor((Date.now() - new Date(municipio.ultima_acta).getTime()) / 86400000)} dies
          </p>
        ) : (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-meta)', margin: 0 }}>
            Sense plens processats
          </p>
        )}
      </div>
    </Link>
  );
}
