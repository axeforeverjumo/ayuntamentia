'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { apiClient } from '@/lib/ApiClient';
import type { SearchResponse, SearchResult } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';

const RESULTS_PER_PAGE = 10;

interface Filters {
  municipio: string;
  partido: string;
  tema: string;
  fecha_desde: string;
  fecha_hasta: string;
}

const emptyFilters: Filters = {
  municipio: '',
  partido: '',
  tema: '',
  fecha_desde: '',
  fecha_hasta: '',
};

function buildQueryString(
  q: string,
  filters: Filters,
  page: number,
): string {
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

export default function BuscarPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const performSearch = useCallback(
    async (q: string, f: Filters, p: number) => {
      if (!q.trim()) return;

      setError(null);
      startTransition(async () => {
        try {
          const qs = buildQueryString(q, f, p);
          const data = await apiClient.get<SearchResponse>(
            `/api/search/?${qs}`,
          );
          setResults(data.results);
          setTotal(data.total);
          setHasSearched(true);
        } catch {
          setError('Error en la cerca. Torna-ho a intentar.');
          setResults([]);
          setTotal(0);
          setHasSearched(true);
        }
      });
    },
    [],
  );

  const handleSearch = () => {
    setPage(1);
    performSearch(query, filters, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(query, filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.ceil(total / RESULTS_PER_PAGE);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Cercar</h1>
        <p className="text-sm text-[#8b949e] mt-0.5">
          Cerca en actes, votacions i declaracions de tots els municipis
        </p>
      </div>

      {/* Search bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cerca actes, votacions, concejals..."
            className="flex-1"
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors',
              showFilters || activeFilterCount > 0
                ? 'bg-[#1e3a8a] border-[#2563eb] text-[#60a5fa]'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#484f58]',
            )}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#2563eb] text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleSearch}
            onKeyDown={handleKeyDown}
            disabled={!query.trim() || isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Cercar
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#e6edf3]">Filtres avançats</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                >
                  <X className="w-3 h-3" />
                  Netejar filtres
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Municipi
                </label>
                <input
                  type="text"
                  value={filters.municipio}
                  onChange={(e) => updateFilter('municipio', e.target.value)}
                  placeholder="Nom del municipi"
                  className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Partit
                </label>
                <input
                  type="text"
                  value={filters.partido}
                  onChange={(e) => updateFilter('partido', e.target.value)}
                  placeholder="Nom del partit"
                  className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Tema
                </label>
                <input
                  type="text"
                  value={filters.tema}
                  onChange={(e) => updateFilter('tema', e.target.value)}
                  placeholder="Tema o matèria"
                  className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Des de
                </label>
                <input
                  type="date"
                  value={filters.fecha_desde}
                  onChange={(e) => updateFilter('fecha_desde', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] focus:outline-none focus:ring-1 focus:ring-[#2563eb] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  Fins a
                </label>
                <input
                  type="date"
                  value={filters.fecha_hasta}
                  onChange={(e) => updateFilter('fecha_hasta', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] focus:outline-none focus:ring-1 focus:ring-[#2563eb] [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#450a0a] border border-[#7f1d1d]">
          <AlertCircle className="w-4 h-4 text-[#f87171] flex-shrink-0" />
          <p className="text-sm text-[#f87171]">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" />
          <span className="ml-2 text-sm text-[#8b949e]">Cercant...</span>
        </div>
      )}

      {/* Results */}
      {!isPending && hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#8b949e]">
              {total === 0 ? (
                'Cap resultat trobat'
              ) : (
                <>
                  <span className="text-[#e6edf3] font-medium">
                    {total.toLocaleString('ca-ES')}
                  </span>{' '}
                  resultats per a &ldquo;{query}&rdquo;
                </>
              )}
            </p>
            {total > 0 && (
              <p className="text-xs text-[#6e7681]">
                Pàgina {page} de {totalPages}
              </p>
            )}
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-[#161b22] border border-[#30363d] rounded-lg">
              <Search className="w-10 h-10 text-[#6e7681] mb-3" />
              <p className="text-sm font-medium text-[#8b949e]">
                Cap resultat per a &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-[#6e7681] mt-1">
                Prova amb altres paraules clau o menys filtres
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <SearchResultCard key={result.id} result={result} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#30363d] text-[#8b949e] hover:bg-[#161b22] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        'w-8 h-8 text-sm rounded-lg transition-colors',
                        pageNum === page
                          ? 'bg-[#2563eb] text-white'
                          : 'border border-[#30363d] text-[#8b949e] hover:bg-[#161b22]',
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#30363d] text-[#8b949e] hover:bg-[#161b22] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Següent
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!isPending && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-[#8b949e]" />
          </div>
          <p className="text-base font-medium text-[#8b949e]">
            Cerca en tots els plens municipals
          </p>
          <p className="text-sm text-[#6e7681] mt-1 max-w-sm">
            Introdueix paraules clau per trobar actes, votacions i
            declaracions de tots els municipis de Catalunya
          </p>
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const href =
    result.tipo === 'acta'
      ? `/actas/${result.id}`
      : result.tipo === 'municipio'
        ? `/municipios/${result.id}`
        : `/actas/${result.id}`;

  return (
    <Link
      href={href}
      className="block bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#484f58] hover:bg-[#1c2128] transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center flex-shrink-0 mt-0.5">
          <FileText className="w-4 h-4 text-[#8b949e]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1c2128] text-[#8b949e] border border-[#30363d] uppercase tracking-wider">
              {result.tipo}
            </span>
            <span className="text-xs text-[#8b949e]">{result.municipio}</span>
            {result.partido && (
              <>
                <span className="text-xs text-[#6e7681]">·</span>
                <span className="text-xs text-[#8b949e]">{result.partido}</span>
              </>
            )}
            <span className="text-xs text-[#6e7681] ml-auto flex-shrink-0">
              {formatDate(result.fecha)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-[#e6edf3] group-hover:text-[#60a5fa] transition-colors mb-1">
            {result.titulo}
          </h3>
          {result.snippet && (
            <p
              className="text-xs text-[#8b949e] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: result.snippet }}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
