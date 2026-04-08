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
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: string;
}

export interface Source {
  id: string;
  tipo: string;
  titulo: string;
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
}

// Alerts types
export type AlertSeverity = 'alta' | 'media' | 'baja';

export interface Alerta {
  id: string;
  severity: AlertSeverity;
  titulo: string;
  descripcion: string;
  municipio: string;
  fecha: string;
  revisada: boolean;
  tipo: string;
}

export interface AlertasStats {
  alta: number;
  media: number;
  baja: number;
  total: number;
  sin_revisar: number;
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
