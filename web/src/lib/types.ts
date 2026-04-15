// Dashboard types
export interface DashboardStats {
  municipios_monitorizados: number;
  actas_procesadas: number;
  votaciones: number;
  alertas_pendientes: number;
}

export interface Tema {
  nombre: string;
  menciones: number;
  tendencia?: 'up' | 'down' | 'stable';
}

export interface Concejal {
  id: string;
  nombre: string;
  partido: string;
  municipio: string;
  coherencia_score?: number;
}

export interface ActaResumen {
  id: string;
  municipio: string;
  fecha: string;
  tipo: string;
  puntos_count: number;
  procesada_en: string;
}

// Search types
export interface SearchResult {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  snippet: string;
  municipio: string;
  fecha: string;
  partido?: string;
  relevancia: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  query: string;
}

// Chat types
export type ChatIntent = 'atacar' | 'defender' | 'comparar' | 'oportunidad' | 'consulta';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  followUps?: string[];
  intent?: ChatIntent;
  timestamp: string;
}

export interface Source {
  id?: string;
  tipo?: string;
  titulo?: string;
  tema?: string;
  municipio?: string;
  fecha?: string;
  url?: string;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  answer: string;
  sources?: Source[];
  follow_ups?: string[];
  intent?: ChatIntent;
}

// Alerts types
export type AlertSeverity = 'alta' | 'media' | 'baja';
export type AlertEstado = 'nueva' | 'vista' | 'resuelta' | 'descartada';

export interface Alerta {
  id: number;
  tipo: string;
  severidad: AlertSeverity;
  titulo: string;
  descripcion: string;
  estado: AlertEstado;
  punto_id?: number | null;
  municipio_id?: number | null;
  cargo_electo_id?: number | null;
  contexto?: Record<string, unknown> | null;
  puntos_comparados?: unknown | null;
  created_at: string;
  viewed_at?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  municipio?: string | null;
  concejal?: string | null;
  punto_titulo?: string | null;
  punto_tema?: string | null;
}

export interface AlertasStats {
  total: number;
  nuevas: number;
  altas_nuevas: number;
  medias_nuevas: number;
  bajas_nuevas: number;
  semana: number;
}

// Municipios types
export interface Municipio {
  id: string;
  nombre: string;
  comarca: string;
  provincia: string;
  poblacion: number;
  actas_procesadas: number;
  num_concejales: number;
  tiene_ac: boolean;
  ultima_acta?: string;
}

export interface MunicipioDetalle extends Municipio {
  composicion_pleno: PartidoRepresentacion[];
  concejales: ConcejalDetalle[];
  ultimos_plenos: ActaResumen[];
  temas_frecuentes: Tema[];
}

export interface PartidoRepresentacion {
  partido: string;
  concejales: number;
  porcentaje: number;
  color?: string;
}

export interface ConcejalDetalle {
  id: string;
  nombre: string;
  partido: string;
  cargo?: string;
  coherencia_score?: number;
  es_ac: boolean;
}

// Acta types
export interface Asistente {
  nombre: string;
  partido: string;
  cargo?: string;
  asistio: boolean;
}

export interface Votacion {
  resultado: string;
  votos_favor: number;
  votos_contra: number;
  abstenciones: number;
  por_partido: Record<string, string>;
}

export interface Argumento {
  concejal: string;
  partido: string;
  posicion: 'favor' | 'contra' | 'abstencion';
  texto: string;
}

export interface PuntoOrdenDia {
  numero: number;
  titulo: string;
  descripcion?: string;
  votacion?: Votacion;
  argumentos?: Argumento[];
}

export interface ActaDetalle {
  id: string;
  municipio: string;
  municipio_id: string;
  fecha: string;
  tipo: string;
  pdf_url?: string;
  asistentes: Asistente[];
  puntos_orden_dia: PuntoOrdenDia[];
}

// Informes types
export interface InformeSemanal {
  id: string;
  semana: string;
  fecha_desde: string;
  fecha_hasta: string;
  resumen_ejecutivo: string;
  destacados: string[];
  municipios_activos: number;
  actas_procesadas: number;
  alertas_generadas: number;
  temas_semana: Tema[];
  actas_destacadas: ActaResumen[];
}
