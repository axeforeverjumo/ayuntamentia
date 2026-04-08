# Estrategia de datos — AyuntamentIA

## El problema

Tenemos ~50.000 actas de plenos (últimos 5 años) en PDF, distribuidas en 947 municipios.
Cada acta debe: descargarse → extraerse texto → estructurarse con LLM → indexarse para búsqueda.
Después, el sistema debe seguir ingiriendo nuevas actas automáticamente.

---

## Principio rector: Pipeline por capas con datos inmutables

Cada acta pasa por **4 capas** sucesivas. Cada capa produce un artefacto persistente e inmutable.
Si una capa falla, se reintenta solo esa capa. No se reprocesa desde el inicio.

```
CAPA 0          CAPA 1           CAPA 2              CAPA 3
Metadatos  →    PDF raw    →     Texto plano    →    Datos estructurados
(CKAN API)      (descarga)       (extracción)        (LLM + embeddings)

Status:         Status:          Status:             Status:
discovered      downloaded       extracted           structured
                failed_download  failed_extraction   failed_structuring
                skipped          ocr_required        needs_review
```

### Por qué capas inmutables
- **Reanudable**: si el sistema se cae a mitad del backfill, retoma donde estaba
- **Auditable**: siempre puedes ver el PDF original vs. lo que extrajo el LLM
- **Reprocesable**: si mejoramos el prompt de extracción, reprocesamos solo capa 3
- **Medible**: métricas de éxito por capa (% descargados, % extraídos, % estructurados)

---

## Capa 0: Catálogo de metadatos

### Fuente
- Seu-e.cat CKAN API: `dadesobertes.seu-e.cat/api/action/datastore_search`
- CSV bulk: `dadesobertes.seu-e.cat/csv/agn-ag-actes-de-ple.csv`

### Estrategia
1. **Carga inicial**: descargar CSV completo (138K registros, <50MB)
2. **Sincronización**: cron diario compara `_id` máximo local vs. remoto
3. **Filtro temporal**: marcar como `backfill_target` las actas de últimos 5 años (~50K)
4. **Enriquecimiento**: cruzar `CODI_ENS` con Municat para asociar municipio → comarca → provincia → concejales → partidos

### Tabla: `actas_catalogo`
```sql
CREATE TABLE actas_catalogo (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,        -- _id de CKAN
    codi_ens        VARCHAR(20),           -- código municipio
    nom_ens         VARCHAR(200),          -- nombre municipio
    data_acord      TIMESTAMP,             -- fecha sesión
    tipus           VARCHAR(50),           -- ordinaria/extraordinaria
    url_pdf         TEXT,                   -- enlace al PDF
    codi_acta       VARCHAR(100),
    -- Estado del pipeline
    status          VARCHAR(30) DEFAULT 'discovered',
    priority        INTEGER DEFAULT 0,     -- 0=normal, 1=alta (municipios AC)
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_actas_status ON actas_catalogo(status);
CREATE INDEX idx_actas_codi_ens ON actas_catalogo(codi_ens);
CREATE INDEX idx_actas_data ON actas_catalogo(data_acord);
```

### Priorización del backfill
```
Prioridad 1: Municipios donde AC tiene concejales (últimos 5 años)
Prioridad 2: Municipios grandes (>20.000 hab.) últimos 2 años
Prioridad 3: Resto de municipios, últimos 5 años, ordenados por fecha DESC
Prioridad 4: Actas más antiguas (>5 años) — solo si el cliente lo pide
```

---

## Capa 1: Descarga de PDFs

### Estrategia
- **Workers paralelos**: 10 descargas concurrentes (respetar rate limits)
- **Almacenamiento**: estructura `/{CODI_ENS}/{YEAR}/{hash}.pdf` en S3/MinIO
- **Deduplicación**: hash SHA-256 del contenido para evitar duplicados
- **Retry**: 3 reintentos con backoff exponencial, luego marca `failed_download`
- **Tamaño esperado**: ~500KB-2MB por PDF → ~30-100GB total

### Tabla: `actas_pdf`
```sql
CREATE TABLE actas_pdf (
    id              SERIAL PRIMARY KEY,
    catalogo_id     INTEGER REFERENCES actas_catalogo(id),
    storage_path    TEXT,                  -- ruta en S3
    file_hash       VARCHAR(64),           -- SHA-256
    file_size       INTEGER,               -- bytes
    content_type    VARCHAR(50),           -- application/pdf, etc.
    status          VARCHAR(30),           -- downloaded, failed_download
    error_message   TEXT,
    downloaded_at   TIMESTAMP
);
```

### Velocidad estimada
- 10 workers × ~2 seg/PDF = ~5 PDFs/seg = ~18.000/hora
- **Backfill completo (50K PDFs): ~3 horas**

---

## Capa 2: Extracción de texto

### Estrategia de 2 vías

```
PDF recibido
    │
    ├─ Intento 1: pdfplumber / pymupdf (extracción nativa)
    │     │
    │     ├─ Si texto > 200 caracteres → OK → status: extracted
    │     └─ Si texto < 200 caracteres → PDF es imagen escaneada
    │                                          │
    │                                          ▼
    └─ Intento 2: Tesseract OCR (catalán + castellano)
          │
          ├─ Si texto > 200 caracteres → OK → status: extracted_ocr
          └─ Si falla → status: failed_extraction
```

### Estimación de tipo de PDF
- **~80% nativos** (generados digitalmente desde ~2015): extracción rápida
- **~15% mixtos** (PDF con algunas páginas escaneadas): OCR parcial
- **~5% escaneados puros** (ayuntamientos pequeños): OCR completo

### Tabla: `actas_texto`
```sql
CREATE TABLE actas_texto (
    id              SERIAL PRIMARY KEY,
    catalogo_id     INTEGER REFERENCES actas_catalogo(id),
    texto_raw       TEXT,                  -- texto extraído completo
    metodo          VARCHAR(20),           -- native, ocr, mixed
    num_paginas     INTEGER,
    num_caracteres  INTEGER,
    idioma_detectado VARCHAR(10),          -- ca, es, mixed
    calidad_score   FLOAT,                 -- 0-1, heurística de calidad
    status          VARCHAR(30),
    extracted_at    TIMESTAMP
);
CREATE INDEX idx_texto_catalogo ON actas_texto(catalogo_id);
```

### Velocidad estimada
- Nativos: ~50/seg (pdfplumber es rápido)
- OCR: ~1-2/min (Tesseract es lento pero paralelizable)
- **Backfill: ~2 horas (nativos) + ~8 horas (OCR en paralelo)**

---

## Capa 3: Estructuración con LLM (la clave del proyecto)

### Estrategia: extracción estructurada en 2 pasadas

#### Pasada 1: Extracción rápida (Haiku — barato y rápido)
Para CADA acta, extraer datos factuales:

```json
{
  "sesion": {
    "fecha": "2024-03-15",
    "tipo": "ordinaria",
    "hora_inicio": "19:00",
    "hora_fin": "21:30"
  },
  "asistentes": [
    {"nombre": "Joan García", "cargo": "alcalde", "partido": "ERC", "presente": true},
    {"nombre": "Maria López", "cargo": "regidora", "partido": "AC", "presente": true}
  ],
  "puntos_orden_dia": [
    {
      "numero": 1,
      "titulo": "Aprovació acta anterior",
      "tema_clasificado": "procedimiento",
      "resultado": "aprobado",
      "votacion": {
        "a_favor": ["ERC", "AC"],
        "en_contra": [],
        "abstenciones": ["PSC"],
        "unanimidad": false
      },
      "resumen": "Se aprueba el acta de la sesión anterior sin observaciones."
    },
    {
      "numero": 2,
      "titulo": "Modificació pressupostària 3/2024",
      "tema_clasificado": "hacienda",
      "resultado": "aprobado",
      "votacion": {
        "a_favor": ["ERC", "PSC"],
        "en_contra": ["AC"],
        "abstenciones": [],
        "unanimidad": false
      },
      "resumen": "Modificación de 150.000€ para obras en el polideportivo.",
      "argumentos": [
        {"partido": "AC", "posicion": "en_contra", "argumento": "Falta de transparencia en la licitación"},
        {"partido": "ERC", "posicion": "a_favor", "argumento": "Necesidad urgente de renovación"}
      ]
    }
  ],
  "ruegos_preguntas": [
    {
      "autor": "Maria López",
      "partido": "AC",
      "tema": "seguridad",
      "contenido": "Pregunta sobre el aumento de robos en el barrio norte"
    }
  ]
}
```

**Coste estimado Pasada 1:**
- Input medio: ~8.000 tokens/acta (texto del PDF)
- Output medio: ~2.000 tokens/acta (JSON estructurado)
- Con Haiku ($0.25/1M input, $1.25/1M output):
  - 50K actas × (8K×$0.00025 + 2K×$0.00125) = **$100 + $125 = ~$225 total backfill**
- Con Haiku batch API (50% descuento): **~$112 total backfill**

#### Pasada 2: Análisis profundo (Sonnet — solo actas relevantes)
Solo para actas donde AC participa o temas de interés:

- Análisis de sentimiento de argumentos
- Clasificación temática fina (taxonomía del partido)
- Detección de posiciones comparables entre municipios
- Generación de resumen ejecutivo

**Coste estimado Pasada 2:**
- Solo ~5.000-10.000 actas relevantes
- Con Sonnet ($3/1M input, $15/1M output):
  - 10K actas × (10K×$0.003 + 3K×$0.015) = **$300 + $450 = ~$750**
- Con batch API (50%): **~$375**

#### Coste total backfill LLM: ~$500-1.000

### Tablas de datos estructurados

```sql
-- Datos extraídos de cada acta
CREATE TABLE actas_estructuradas (
    id              SERIAL PRIMARY KEY,
    catalogo_id     INTEGER REFERENCES actas_catalogo(id),
    datos_json      JSONB,                 -- JSON completo extraído
    modelo_usado    VARCHAR(50),           -- haiku-4.5, sonnet-4.6
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    coste_usd       FLOAT,
    pasada          INTEGER,               -- 1 o 2
    status          VARCHAR(30),
    processed_at    TIMESTAMP
);

-- Puntos del orden del día (desnormalizado para queries rápidas)
CREATE TABLE puntos_pleno (
    id              SERIAL PRIMARY KEY,
    acta_id         INTEGER REFERENCES actas_estructuradas(id),
    catalogo_id     INTEGER,
    municipio_codi  VARCHAR(20),
    fecha           DATE,
    numero          INTEGER,
    titulo          TEXT,
    tema            VARCHAR(100),          -- clasificación temática
    resultado       VARCHAR(30),           -- aprobado, rechazado, retirado
    resumen         TEXT,
    unanimidad      BOOLEAN,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_puntos_tema ON puntos_pleno(tema);
CREATE INDEX idx_puntos_fecha ON puntos_pleno(fecha);
CREATE INDEX idx_puntos_municipio ON puntos_pleno(municipio_codi);

-- Votaciones individuales
CREATE TABLE votaciones (
    id              SERIAL PRIMARY KEY,
    punto_id        INTEGER REFERENCES puntos_pleno(id),
    cargo_electo_id INTEGER,               -- FK a tabla de Municat
    nombre          VARCHAR(200),
    partido         VARCHAR(100),
    sentido         VARCHAR(20),           -- a_favor, en_contra, abstencion
    municipio_codi  VARCHAR(20),
    fecha           DATE
);
CREATE INDEX idx_votaciones_partido ON votaciones(partido);
CREATE INDEX idx_votaciones_sentido ON votaciones(sentido);

-- Argumentos por partido
CREATE TABLE argumentos (
    id              SERIAL PRIMARY KEY,
    punto_id        INTEGER REFERENCES puntos_pleno(id),
    partido         VARCHAR(100),
    posicion        VARCHAR(20),
    argumento       TEXT,
    embedding       vector(1536)           -- pgvector para búsqueda semántica
);
```

---

## Búsqueda: estrategia híbrida

### 3 modos de búsqueda

```
┌─────────────────────────────────────────────────────┐
│              BÚSQUEDA HÍBRIDA                        │
│                                                      │
│  1. KEYWORD (PostgreSQL full-text search)            │
│     "pressupost poliesportiu Vic"                    │
│     → ts_vector sobre texto_raw + títulos            │
│     → Rápido, preciso para términos exactos          │
│                                                      │
│  2. SEMÁNTICA (pgvector + embeddings)                │
│     "debates sobre inmigración en el Maresme"        │
│     → Embedding de la query vs. embeddings de actas  │
│     → Encuentra conceptos relacionados               │
│                                                      │
│  3. ESTRUCTURADA (SQL sobre datos extraídos)         │
│     "votaciones de AC en contra en hacienda"         │
│     → Query SQL sobre votaciones + puntos_pleno      │
│     → Filtros exactos por partido, tema, sentido     │
│                                                      │
│  4. CONVERSACIONAL (LLM + RAG)                       │
│     "¿Qué opina AC sobre el urbanismo en Girona?"   │
│     → LLM interpreta la pregunta                     │
│     → Combina los 3 modos anteriores                 │
│     → Genera respuesta con citas a actas específicas │
└─────────────────────────────────────────────────────┘
```

### Embeddings
- **Unidad de embedding**: cada punto del orden del día (no el acta completa)
- **Modelo**: Voyage AI `voyage-3` o `text-embedding-3-small` de OpenAI
- **Almacenamiento**: pgvector en PostgreSQL (sin necesidad de DB separada)
- **Coste**: ~$5-10 para todo el corpus (~500K puntos × ~200 tokens)

### Full-text search
```sql
-- Índice GIN para búsqueda full-text en catalán y castellano
ALTER TABLE actas_texto ADD COLUMN tsv tsvector;
UPDATE actas_texto SET tsv = 
    setweight(to_tsvector('spanish', coalesce(texto_raw,'')), 'A');
CREATE INDEX idx_actas_tsv ON actas_texto USING GIN(tsv);

-- Ejemplo de búsqueda
SELECT * FROM actas_texto 
WHERE tsv @@ plainto_tsquery('spanish', 'pressupost urbanisme')
ORDER BY ts_rank(tsv, plainto_tsquery('spanish', 'pressupost urbanisme')) DESC;
```

---

## Coherencia interna: algoritmo

### Detección de incoherencias

```
Para cada votación de un concejal de AC:

1. CLASIFICAR el tema del punto (taxonomía: urbanismo, hacienda, 
   seguridad, medio ambiente, servicios sociales, cultura, etc.)

2. BUSCAR votaciones del mismo tema por otros concejales de AC
   en otros municipios (ventana: últimos 6 meses)

3. COMPARAR:
   - Si todos votan igual → coherente ✅
   - Si hay división → ALERTA ⚠️
     - Calcular: quién es mayoría, quién diverge
     - Buscar si existe línea oficial del partido sobre el tema
     - Si existe línea y alguien la contradice → ALERTA ALTA 🔴

4. GENERAR alerta con contexto:
   - "En Vic, Joan García (AC) votó A FAVOR de modificación 
     presupuestaria para polideportivo. Sin embargo, en Manresa 
     y Terrassa, los concejales de AC votaron EN CONTRA de 
     modificaciones presupuestarias similares en los últimos 3 meses.
     Argumento en Vic: 'necesidad deportiva'. 
     Argumento en Manresa: 'falta de transparencia en licitación'."
```

### Complejidad: no todo es blanco/negro

El LLM es clave aquí porque dos votaciones pueden parecer iguales por tema pero ser contextos completamente diferentes. La comparación necesita:

1. **Similitud temática** (embedding distance < threshold)
2. **Similitud de contexto** (LLM valida si son realmente comparables)
3. **Histórico** (¿es un patrón o un caso aislado?)

---

## Cron y flujo continuo

### Trabajos programados

| Job | Frecuencia | Qué hace |
|-----|-----------|----------|
| `sync_catalogo` | Cada 6h | Consulta CKAN API por nuevas actas |
| `sync_cargos` | Semanal | Actualiza cargos electos desde Municat |
| `download_pdfs` | Continuo | Cola de descarga de PDFs pendientes |
| `extract_text` | Continuo | Extrae texto de PDFs descargados |
| `structure_llm` | Continuo | Pasa textos por LLM para estructurar |
| `generate_embeddings` | Continuo | Genera embeddings de nuevos puntos |
| `check_coherencia` | Tras cada structuring | Evalúa coherencia si es acta de AC |
| `backfill` | Continuo (baja prioridad) | Procesa actas antiguas en background |
| `informe_semanal` | Lunes 8:00 | Genera y envía informe semanal |

### Prioridad en la cola

```
URGENTE:  Actas nuevas de municipios con concejales de AC
ALTA:     Actas nuevas del resto de municipios
NORMAL:   Backfill de municipios con concejales de AC
BAJA:     Backfill del resto
```

---

## Resumen de costes estimados

### Backfill (una vez)

| Concepto | Coste |
|----------|-------|
| LLM Pasada 1 (Haiku batch, 50K actas) | ~$112 |
| LLM Pasada 2 (Sonnet batch, 10K actas) | ~$375 |
| Embeddings (500K puntos) | ~$10 |
| OCR (Tesseract, self-hosted) | $0 |
| **Total backfill** | **~$500** |

### Mensual (operación)

| Concepto | Coste |
|----------|-------|
| LLM nuevas actas (~1.000/mes) | ~$5-15 |
| LLM Q&A usuarios (estimación) | ~$20-50 |
| LLM informes semanales | ~$5-10 |
| Embeddings nuevos | ~$0.50 |
| Infraestructura (Railway/Fly.io) | ~$25-50 |
| Storage S3 (100GB) | ~$2-5 |
| **Total mensual** | **~$60-130** |

---

## Gestión de calidad de datos

### Problemas esperados y mitigaciones

| Problema | Frecuencia | Mitigación |
|----------|-----------|------------|
| PDF corrupto/vacío | ~1% | Reintentar descarga, marcar si persiste |
| PDF escaneado de mala calidad | ~5% | OCR con postprocesamiento, flag para revisión manual |
| Acta sin votaciones detalladas | ~20% | El LLM extrae lo que hay; campo `calidad_datos` |
| Nombres de concejales inconsistentes | Frecuente | Fuzzy matching contra directorio Municat |
| Idioma mixto (catalán/castellano) | ~60% | LLM maneja ambos; embeddings multilingües |
| Acta con formato no estándar | ~10% | Prompt flexible; fallback a resumen básico |
| CKAN API caída temporalmente | Ocasional | Retry con backoff; alertar si >24h |

### Score de calidad por acta
Cada acta procesada recibe un `quality_score` (0-100):
- +30 si tiene votaciones detalladas por nombre
- +20 si tiene argumentos/intervenciones
- +20 si tiene lista de asistentes completa
- +15 si el texto se extrajo sin OCR (más fiable)
- +15 si el LLM pudo clasificar todos los puntos temáticamente
