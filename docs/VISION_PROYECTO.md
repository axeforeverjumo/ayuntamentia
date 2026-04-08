# AyuntamentIA - Visión del Proyecto

## Cliente
**Aliança Catalana** — partido político con presencia en múltiples municipios de Catalunya.

## Objetivo
Sistema de inteligencia política basado en IA que monitoriza los 947 municipios de Catalunya, extrayendo y analizando actas de plenos municipales para detectar coherencia interna del partido, inteligencia competitiva y tendencias territoriales.

---

## Decisiones del cliente (7 abril 2026)

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Alcance | **947 municipios desde el día 1** |
| 2 | Línea oficial del partido | Por investigar — no saben la importancia todavía |
| 3 | Funcionalidad principal | Qué se habla en los plenos + búsqueda por palabras clave/temas + interfaz tipo NotebookLLM |
| 4 | Prioridad | **Coherencia interna del partido = Fase 1** |
| 5 | Entregable | **Web interactiva** donde puedan preguntar y explorar datos |
| 6 | Usuarios | Dirección del partido (perfiles exactos no especificados) |
| 7 | Canales | **Web + Telegram** |
| 8 | Modelo de negocio | **Suscripción** — aceptan pago por API de LLM |
| 9 | Datos históricos | Desde activación + cron que cargue retroactivamente hasta **5 años atrás** |
| 10 | Frecuencia | Batch periódico (propuesta: diario para nuevas actas, semanal para informes) |

---

## Arquitectura propuesta de alto nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Web App  │  │  Telegram Bot │  │  Informes automáticos  │ │
│  │ (Next.js) │  │              │  │  (PDF/email semanal)   │ │
│  └─────┬─────┘  └──────┬───────┘  └───────────┬────────────┘ │
│        │               │                      │              │
│        └───────────────┼──────────────────────┘              │
│                        │                                     │
│                   ┌────▼─────┐                               │
│                   │   API    │                               │
│                   │ Gateway  │                               │
│                   └────┬─────┘                               │
└────────────────────────┼─────────────────────────────────────┘

┌────────────────────────┼─────────────────────────────────────┐
│                   BACKEND                                     │
│                        │                                     │
│  ┌─────────────────────▼──────────────────────────────┐      │
│  │              API REST / GraphQL                     │      │
│  │                                                     │      │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │      │
│  │  │ Búsqueda │ │  Chat /  │ │  Alertas coherencia │ │      │
│  │  │ semántica│ │ Q&A LLM  │ │  interna            │ │      │
│  │  └──────────┘ └──────────┘ └─────────────────────┘ │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │              MOTOR DE PROCESAMIENTO                  │      │
│  │                                                     │      │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │      │
│  │  │ Descarga │ │Extracción│ │  Análisis LLM       │ │      │
│  │  │  PDFs    │→│  texto   │→│  (estructuración)   │ │      │
│  │  └──────────┘ └──────────┘ └─────────────────────┘ │      │
│  │                                                     │      │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │      │
│  │  │Embeddings│ │Detección │ │  Generación informes│ │      │
│  │  │vectores  │ │coherencia│ │  automáticos        │ │      │
│  │  └──────────┘ └──────────┘ └─────────────────────┘ │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │              DATA INGESTION (CRON)                   │      │
│  │                                                     │      │
│  │  ┌──────────────┐  ┌──────────────┐                 │      │
│  │  │ Seu-e.cat    │  │ Municat      │                 │      │
│  │  │ CKAN API     │  │ Socrata API  │                 │      │
│  │  │ (actas PDFs) │  │ (cargos)     │                 │      │
│  │  └──────────────┘  └──────────────┘                 │      │
│  │                                                     │      │
│  │  ┌──────────────┐  ┌──────────────┐                 │      │
│  │  │ BCNROC       │  │ Webs propias │                 │      │
│  │  │ OAI-PMH      │  │ (headless)   │                 │      │
│  │  │ (Barcelona)  │  │              │                 │      │
│  │  └──────────────┘  └──────────────┘                 │      │
│  └─────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    ALMACENAMIENTO                              │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │  PostgreSQL   │  │  Vector DB   │  │  Object Storage      ││
│  │  (datos       │  │  (embeddings │  │  (PDFs originales)   ││
│  │  estructurados│  │  búsqueda    │  │                      ││
│  │  actas, votos)│  │  semántica)  │  │                      ││
│  └──────────────┘  └──────────────┘  └──────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

## Fases del proyecto

### FASE 1: Infraestructura de datos + Coherencia interna (MVP)

**Objetivo:** Tener todos los datos ingestados y el sistema de coherencia interna funcionando.

#### 1.1 Data Pipeline
- [ ] Ingestión de cargos electos desde Municat (Socrata API)
- [ ] Ingestión de inventario de actas desde Seu-e.cat (CKAN API)
- [ ] Descarga masiva de PDFs con cola de trabajo
- [ ] Extracción de texto de PDFs (pdfplumber/pymupdf para nativos, Tesseract para escaneados)
- [ ] Pipeline LLM para estructurar cada acta: temas, votaciones, asistentes, acuerdos
- [ ] Generación de embeddings para búsqueda semántica
- [ ] Cron para nuevas actas (diario) + backfill retroactivo (5 años)

#### 1.2 Motor de coherencia interna
- [ ] Modelo de datos: línea oficial del partido por tema
- [ ] Comparador de votaciones: detectar cuando concejales de AC votan diferente en temas equivalentes
- [ ] Sistema de alertas (Telegram + web)
- [ ] Dashboard de coherencia: mapa + ranking de alineación

#### 1.3 Web MVP
- [ ] Autenticación (solo miembros del partido)
- [ ] Buscador semántico de actas ("¿qué se ha votado sobre urbanismo en Girona?")
- [ ] Chat Q&A tipo NotebookLLM sobre las actas
- [ ] Dashboard de coherencia interna
- [ ] Alertas en tiempo real

#### 1.4 Telegram Bot
- [ ] Alertas de incoherencia
- [ ] Consultas rápidas ("¿qué se aprobó ayer en Vic?")
- [ ] Resúmenes semanales

### FASE 2: Inteligencia competitiva
- [ ] Monitoreo de votaciones de TODOS los partidos
- [ ] Detección de contradicciones entre discurso nacional y acción municipal de rivales
- [ ] Análisis de tendencias territoriales por tema
- [ ] Comparativas inter-municipales

### FASE 3: Comunicación y contenido
- [ ] Generador automático de notas de prensa basadas en datos
- [ ] Contenido localizado para RRSS
- [ ] Documentación de promesas incumplidas de rivales
- [ ] Informes de gestión automáticos

---

## Stack tecnológico propuesto

| Componente | Tecnología | Justificación |
|------------|-----------|---------------|
| Frontend web | Next.js + TypeScript | SSR, buen DX, escalable |
| Bot Telegram | python-telegram-bot / grammy | Madurez, buena documentación |
| API Backend | Python (FastAPI) | Ecosistema ML/NLP, async nativo |
| Base de datos | PostgreSQL + pgvector | Datos relacionales + búsqueda vectorial en uno |
| Cola de trabajo | Celery + Redis | Pipeline de procesamiento de PDFs |
| Extracción PDF | pdfplumber + Tesseract OCR | Cobertura completa (nativos + escaneados) |
| LLM | Claude API (Anthropic) | Extracción estructurada, Q&A, análisis |
| Embeddings | Voyage AI / OpenAI | Búsqueda semántica |
| Object Storage | S3 / MinIO | Almacenamiento de PDFs originales |
| Infraestructura | Docker + Railway/Fly.io | Despliegue simple, escalable |
| Cron/Scheduler | Celery Beat | Ingestión periódica |

---

## Modelo de datos conceptual

### Entidades principales

```
Municipio (947)
├── codigo_ens, nombre, comarca, provincia, poblacion
├── url_sede_electronica
└── cargos_electos[]

CargoElecto (~10.591)
├── nombre, cargo, partido_politico
├── municipio_id, area_responsabilidad
└── fecha_nombramiento

ActaPlenaria (~138.815 + creciendo)
├── municipio_id, fecha, tipo (ordinaria/extraordinaria)
├── url_pdf, texto_extraido
├── embedding (vector)
└── puntos_orden_dia[]

PuntoOrdenDia
├── acta_id, numero, titulo, descripcion
├── tema_clasificado (urbanismo, hacienda, servicios sociales...)
├── resultado (aprobado, rechazado, retirado)
└── votaciones[]

Votacion
├── punto_id, cargo_electo_id
├── sentido (a_favor, en_contra, abstencion)
└── partido_politico

LineaOficialPartido
├── tema, posicion_oficial, fecha_vigencia
└── descripcion, keywords

AlertaCoherencia
├── tipo, severidad
├── cargo_electo_id, punto_id
├── descripcion, recomendacion
└── estado (nueva, revisada, resuelta)
```

---

## Estimación de volumen

| Concepto | Volumen estimado |
|----------|-----------------|
| Municipios | 947 |
| Cargos electos | ~10.600 |
| Actas totales (seu-e.cat) | ~138.000 |
| Actas últimos 5 años (estimación) | ~30.000-50.000 |
| Tamaño medio PDF | ~500KB-2MB |
| Almacenamiento PDFs (5 años) | ~30-100 GB |
| Tokens LLM por acta (extracción) | ~5.000-20.000 |
| Coste LLM backfill (50K actas × ~10K tokens) | ~$25-75 (con Haiku) |
| Coste LLM mensual (nuevas actas) | ~$5-15/mes |

---

## Preguntas pendientes para el cliente

1. **Línea oficial del partido**: ¿Existe documentada? Si no, ¿quién la define en el sistema? ¿La dirección carga posiciones por tema?
2. **Número de concejales actuales de AC**: Para dimensionar el piloto de coherencia.
3. **Usuarios del sistema**: ¿Cuántos usuarios concurrentes esperan? ¿Solo dirección o también concejales locales?
4. **Presupuesto**: Para definir infraestructura (cloud vs. self-hosted).
5. **Branding**: ¿Nombre del producto? ¿Colores/identidad visual?
6. **Prioridad Barcelona**: Barcelona no está en seu-e.cat y tiene protección anti-scraping. ¿Es prioritaria o puede ir en fase posterior?
