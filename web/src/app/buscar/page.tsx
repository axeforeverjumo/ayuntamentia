'use client';

import { useState, useCallback, useTransition, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, FileText, ChevronLeft, ChevronRight, Filter, X, Loader2, AlertCircle,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { apiClient } from '@/lib/ApiClient';
import type { SearchResponse, SearchResult } from '@/lib/types';
import { APP_ROUTES, buildRoute } from '@/lib/routes';
import { formatDate } from '@/lib/utils';

const RESULTS_PER_PAGE = 10;
const MIN_RESULTS_FOR_CONFIDENT_SEARCH = 3;
const MAX_SUGGESTIONS = 5;
const STOP_WORDS = new Set([
  'de', 'del', 'la', 'el', 'els', 'les', 'i', 'a', 'en', 'amb', 'per', 'al', 'que',
]);

function normalizeToken(token: string): string {
  return token
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenizeQuery(value: string): string[] {
  return value
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .map(normalizeToken)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function buildSuggestedQueries(query: string, currentFilters: Filters): string[] {
  const suggestions = new Set<string>();
  const cleanQuery = query.trim();
  const compactQuery = cleanQuery.replace(/\s+/g, ' ');

  if (compactQuery && compactQuery !== cleanQuery) {
    suggestions.add(compactQuery);
  }

  const queryTokens = tokenizeQuery(cleanQuery);

  if (queryTokens.length > 1) {
    suggestions.add(queryTokens.join(' '));
  }

  if (queryTokens.length > 1) {
    suggestions.add(queryTokens.slice(0, 2).join(' '));
  }

  if (queryTokens.length > 2) {
    suggestions.add(queryTokens[queryTokens.length - 1]);
  }

  if (Object.values(currentFilters).some(Boolean)) {
    suggestions.add(cleanQuery);
  }

  return Array.from(suggestions)
    .map(suggestion => suggestion.trim())
    .filter(suggestion => suggestion && suggestion.toLowerCase() !== cleanQuery.toLowerCase())
    .slice(0, MAX_SUGGESTIONS);
}

interface Filters {
  municipio: string;
  partido: string;
  tema: string;
  fecha_desde: string;
  fecha_hasta: string;
}

const emptyFilters: Filters = { municipio: '', partido: '', tema: '', fecha_desde: '', fecha_hasta: '' };

function buildQueryString(q: string, filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (filters.municipio) params.set('municipio', filters.municipio);
  if (filters.partido) params.set('partido', filters.partido);
  if (filters.tema) params.set('tema', filters.tema);
  if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
  params.set('page', String(page));
  params.set('per_page', String(RESULTS_PER_PAGE));
  return params.toString();
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  background: 'var(--bg-elevated)', border: '.5px solid var(--border-em)',
  borderRadius: 'var(--r-md)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-meta)', marginBottom: 4,
};

function BuscarPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
  const [isVagueResult, setIsVagueResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  const performSearch = useCallback(async (q: string, f: Filters, p: number) => {
    if (!q.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const qs = buildQueryString(q, f, p);
        const data = await apiClient.get<SearchResponse>(`/api/search/?${qs}`);
        const totalResults = data.total ?? data.results.length;
        const vagueSearch = totalResults > 0 && totalResults < MIN_RESULTS_FOR_CONFIDENT_SEARCH;
        const noResults = totalResults === 0;

        setResults(data.results);
        setTotal(totalResults);
        setIsVagueResult(vagueSearch);
        setSuggestedQueries((noResults || vagueSearch) ? buildSuggestedQueries(q, f) : []);
        setHasSearched(true);
      } catch {
        setError('Error en la cerca. Torna-ho a intentar.');
        setResults([]);
        setTotal(0);
        setIsVagueResult(false);
        setSuggestedQueries([]);
        setHasSearched(true);
      }
    });
  }, []);

  useEffect(() => {
    if (initialQ) performSearch(initialQ, emptyFilters, 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); performSearch(query, filters, 1); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(query, filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const updateFilter = (key: keyof Filters, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(emptyFilters);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.ceil(total / RESULTS_PER_PAGE);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>Operacions / Cercar</div>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1.1, margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
          Cerca <span style={{ color: 'var(--brand-l)', fontStyle: 'italic' }}>universal.</span>
        </h1>
      </div>
      <div style={{ padding: '20px 26px', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Search bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Cerca actes, votacions, concejals..."
                className="flex-1"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                background: showFilters || activeFilterCount > 0 ? 'rgba(15,76,129,.1)' : 'var(--bg-surface)',
                border: `.5px solid ${showFilters || activeFilterCount > 0 ? 'var(--brand)' : 'var(--border)'}`,
                color: showFilters || activeFilterCount > 0 ? 'var(--brand-l)' : 'var(--text-secondary)',
                borderRadius: 'var(--r-md)', fontSize: 13, cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <Filter style={{ width: 14, height: 14 }} />
              Filtres
              {activeFilterCount > 0 && (
                <span style={{ width: 18, height: 18, borderRadius: 'var(--r-full)', background: 'var(--brand)', color: '#E8F1F9', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={handleSearch}
              onKeyDown={handleKeyDown}
              disabled={!query.trim() || isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'var(--brand)', color: '#E8F1F9',
                border: '1px solid var(--brand)', borderRadius: 'var(--r-md)',
                fontSize: 13, fontWeight: 500, cursor: !query.trim() || isPending ? 'not-allowed' : 'pointer',
                opacity: !query.trim() || isPending ? 0.5 : 1, transition: 'opacity .15s',
                boxShadow: '0 0 20px -6px rgba(15,76,129,.4)',
              }}
            >
              {isPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Search style={{ width: 14, height: 14 }} />}
              Cercar
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Filtres avançats</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-meta)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X style={{ width: 12, height: 12 }} /> Netejar filtres
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { key: 'municipio' as const, label: 'Municipi', placeholder: 'Nom del municipi' },
                  { key: 'partido' as const, label: 'Partit', placeholder: 'Nom del partit' },
                  { key: 'tema' as const, label: 'Tema', placeholder: 'Tema o matèria' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input type="text" value={filters[key]} onChange={e => updateFilter(key, e.target.value)} placeholder={placeholder} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Des de</label>
                  <input type="date" value={filters.fecha_desde} onChange={e => updateFilter('fecha_desde', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={labelStyle}>Fins a</label>
                  <input type="date" value={filters.fecha_hasta} onChange={e => updateFilter('fecha_hasta', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: 'rgba(220,38,38,.08)', border: '.5px solid rgba(220,38,38,.3)' }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 style={{ width: 22, height: 22, color: 'var(--brand)' }} className="animate-spin" />
            <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-meta)' }}>Cercant...</span>
          </div>
        )}

        {/* Results */}
        {!isPending && hasSearched && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                {total === 0 ? 'Cap resultat trobat' : (
                  <><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{total.toLocaleString('ca-ES')}</span> resultats per a &ldquo;{query}&rdquo;</>
                )}
              </p>
              {total > 0 && <p style={{ fontSize: 11, color: 'var(--text-meta)', margin: 0 }}>Pàgina {page} de {totalPages}</p>}
            </div>

            {results.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                <Search style={{ width: 36, height: 36, color: 'var(--text-meta)', marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Cap resultat per a &ldquo;{query}&rdquo;</p>
                <p style={{ fontSize: 12, color: 'var(--text-meta)', margin: 0 }}>Prova amb altres paraules clau o menys filtres</p>
              </div>
            ) : (
              <>
                {isVagueResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'rgba(245,158,11,.08)', border: '.5px solid rgba(245,158,11,.35)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      Resultat <strong style={{ color: 'var(--text-primary)' }}>vague</strong>: hem trobat només {total} coincidències.
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-meta)', margin: 0 }}>
                      Prova una cerca més general o una de les següents suggerències.
                    </p>
                  </div>
                )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map(result => <SearchResultCard key={result.id} result={result} />)}
              </div>
              </>
            )}

            {suggestedQueries.length > 0 && (
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-meta)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Suggerència de cerca
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {suggestedQueries.map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => { setQuery(suggestion); setPage(1); performSearch(suggestion, filters, 1); }}
                      style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--r-full)', border: '.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8 }}>
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 13, background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Anterior
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button key={pageNum} onClick={() => handlePageChange(pageNum)}
                        style={{ width: 32, height: 32, fontSize: 13, borderRadius: 'var(--r-md)', border: '.5px solid var(--border)', background: pageNum === page ? 'var(--brand)' : 'var(--bg-surface)', color: pageNum === page ? '#E8F1F9' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 13, background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-secondary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                  Següent <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Initial empty state */}
        {!isPending && !hasSearched && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, margin: '0 auto 16px', border: '.5px solid var(--border)', display: 'grid', placeItems: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)' }}>
              <Search style={{ width: 26, height: 26, color: 'var(--text-meta)' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              Cerca <span style={{ color: 'var(--brand-l)', fontStyle: 'italic' }}>universal</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Cerca en actes, votacions i declaracions de tots els 947 municipis de Catalunya.
            </p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-meta)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12 }}>
              Cerques suggerides
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400, margin: '0 auto' }}>
              {['habitatge social', 'civisme terrasses', 'seguretat ciutadana', 'pressupost 2026', 'immigració'].map(q => (
                <button key={q} onClick={() => { setQuery(q); performSearch(q, filters, 1); }} style={{
                  padding: '10px 14px', background: 'var(--bg-surface)', border: '.5px solid var(--border)',
                  borderRadius: 'var(--r-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 13,
                  cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s',
                }}>
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}><Loader2 style={{ width: 22, height: 22, color: 'var(--brand)' }} className="animate-spin" /></div>}>
      <BuscarPageInner />
    </Suspense>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const href = result.tipo === 'municipio'
    ? buildRoute('municipis', result.id)
    : buildRoute('actes', result.id);
  return (
    <Link href={href} style={{
      display: 'block', background: 'var(--bg-surface)', border: '.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 16, textDecoration: 'none', transition: 'border-color .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <FileText style={{ width: 14, height: 14, color: 'var(--text-meta)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ padding: '1px 6px', borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 500, background: 'var(--bg-elevated)', color: 'var(--text-meta)', border: '.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {result.tipo}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-meta)' }}>{result.municipio}</span>
            {result.partido && (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-meta)' }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--text-meta)' }}>{result.partido}</span>
              </>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-meta)', marginLeft: 'auto', flexShrink: 0 }}>{formatDate(result.fecha)}</span>
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.3 }}>
            {result.titulo}
          </h3>
          {result.snippet && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: result.snippet }} />
          )}
        </div>
      </div>
    </Link>
  );
}
