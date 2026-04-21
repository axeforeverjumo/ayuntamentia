# AjuntamentIA — Plan Maestro v2

> Sistema de inteligencia política para Aliança Catalana
> 947 municipios · 138.000+ actas · Coherencia interna · IA conversacional
> Fecha: 7 abril 2026

---

## 1. Resumen ejecutivo

### Qué construimos
Una plataforma web + Telegram que ingiere todas las actas de plenos municipales
de Catalunya, las analiza con IA y permite a la dirección de Aliança Catalana:
- Detectar incoherencias de voto entre sus concejales
- Buscar y preguntar sobre cualquier tema debatido en cualquier municipio
- Recibir alertas automáticas cuando se aprueba algo relevante
- Obtener informes semanales de actividad política

### Por qué podemos hacerlo
- Las actas están en una **API pública** (CKAN, 138K registros con URLs a PDFs)
- Los cargos electos están en otra **API pública** (Socrata, 10.591 registros)
- Ya tenemos **GPT-5.4 + GPT-5.4-mini vía OpenClaw** — sin coste LLM adicional
- Ya tenemos **Supabase + Qdrant** corriendo — sin infra nueva
- Todo es datos públicos bajo licencia CC0

### Coste adicional: ~$0
Todo corre sobre la infra existente en 85.215.105.45.
LLM via OpenClaw (OpenAI Codex, ya pagado).

---

## 2. Infraestructura existente

```
Servidor: 85.215.105.45
├── 128 GB RAM · 16 CPUs · 1.5 TB libres · Ubuntu 24.04
│
├── OpenClaw 2026.4.2 (LLM Engine)
│   ├── GPT-5.4         → análisis profundo, coherencia, Q&A
│   ├── GPT-5.4-mini    → extracción masiva de actas (barato/rápido)
│   ├── HTTP Bridge :4200 → API compatible OpenAI SDK
│   └── 8 agentes concurrentes / 16 subagentes
│
├── Supabase (ya corriendo)
│   ├── PostgreSQL 15    → datos relacionales + full-text search
│   ├── Auth             → JWT, magic links
│   ├── Storage (MinIO)  → almacenamiento PDFs
│   ├── Realtime         → alertas en vivo
│   └── Studio :54323    → admin UI
│
├── Qdrant :6333 (ya corriendo)
│   └── Vector DB        → búsqueda semántica
│
└── Docker               → 30+ contenedores estables
```

### Lo que añadimos (4 contenedores nuevos)
```
ayuntamentia-pipeline     Python    → descarga + extracción + LLM + cron
ayuntamentia-api          FastAPI   → API REST backend
ayuntamentia-web          Next.js   → dashboard + chat + alertas
ayuntamentia-telegram     Python    → bot de alertas y consultas
```

---

## 3. Modelos LLM — Cuándo usar cada uno

| Tarea | Modelo | Por qué |
|-------|--------|---------|
| Extracción masiva de actas (50K) | **GPT-5.4-mini** | Barato, rápido. Suficiente para extraer datos factuales de un PDF |
| Análisis de coherencia | **GPT-5.4** | Necesita razonamiento: ¿son comparables dos votaciones en contextos distintos? |
| Chat Q&A del usuario | **GPT-5.4** | Calidad de respuesta para el usuario final |
| Informes semanales | **GPT-5.4** | Redacción de calidad ejecutiva |
| Clasificación de temas | **GPT-5.4-mini** | Clasificar es sencillo, no necesita el grande |
| Generación de embeddings | **API embeddings** | Modelo de embeddings dedicado (más eficiente que LLM) |

### Agentes OpenClaw dedicados

| Agente | Modelo | Función | Slots |
|--------|--------|---------|-------|
| `acta-extractor` | GPT-5.4-mini | Extracción masiva + clasificación | 2 |
| `acta-analyst` | GPT-5.4 | Coherencia + Q&A + informes | 2 |

Quedan 4 slots libres para los agentes existentes (donna, claudia, etc.).

---

## 4. Ritmo de backfill — 3 semanas, suave y constante

### Cálculo

```
~50.000 actas últimos 5 años
÷ 21 días
= 2.381 actas/día

÷ 24 horas
= ~100 actas/hora

÷ 60 minutos
= ~1.7 actas/minuto

Con 2 slots de acta-extractor:
→ 1 acta cada ~17 segundos
→ Ritmo cómodo, sin estresar OpenClaw ni OpenAI
→ Deja capacidad para el resto de agentes
```

### Prioridad de procesamiento

```
Semana 1:  Municipios con concejales de AC (prioridad máxima)
Semana 2:  Municipios >20.000 habitantes (últimos 2 años)
Semana 3:  Resto de municipios hasta completar 5 años
Continuo:  Nuevas actas cada 6 horas (cron)
```

### Monitorización del backfill
```
Dashboard interno (Supabase Studio o endpoint dedicado):
- Total actas: catalogadas / descargadas / extraídas / estructuradas
- Tasa actual: actas/hora
- Errores: fallidas por paso + motivo
- ETA: estimación de finalización
- Por municipio: progreso individual
```

---

## 5. Pipeline de datos

### Flujo de una acta (8 pasos)

```
[1] DESCUBRIR ──→ CKAN API → registrar en Supabase
                  (municipio, fecha, tipo, URL del PDF)
         │
[2] DESCARGAR ──→ GET PDF → Supabase Storage
                  (hash SHA-256, ~1MB medio)
         │
[3] EXTRAER ────→ pdfplumber (nativo) o Tesseract (OCR)
                  (texto plano + páginas + idioma + calidad)
         │
[4] ESTRUCTURAR → OpenClaw → GPT-5.4-mini
                  (JSON: asistentes, puntos, votaciones, argumentos)
         │
[5] ENRIQUECER ─→ cruzar con Municat
                  (concejal → partido → municipio)
         │
[6] INDEXAR ────→ embeddings → Qdrant
                  full-text → PostgreSQL tsvector
         │
[7] ANALIZAR ──→ si hay concejales de AC:
                  GPT-5.4 compara con votaciones similares
                  detecta incoherencias → genera alerta
         │
[8] NOTIFICAR ─→ alerta → Telegram + dashboard web
```

---

## 6. La web — Diseño completo

### 6.1 Pantallas principales

```
┌─────────────────────────────────────────────────────────────────┐
│                      AJUNTAMENTIA                                │
│  ┌──────┬──────────┬────────┬──────────┬───────────┬──────────┐ │
│  │ Home │ Buscador │ Chat   │ Alertas  │ Municipios│ Informes │ │
│  └──────┴──────────┴────────┴──────────┴───────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 HOME — Dashboard principal

```
┌─────────────────────────────────────────────────────────────────┐
│  AJUNTAMENTIA                          [avatar] Juan Manuel  ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Resumen rápido ──────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  947          52.341        3.241         12               │  │
│  │  municipios   actas         votaciones    alertas          │  │
│  │  monitorizados procesadas   de AC         pendientes       │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Mapa Catalunya ─────────────┐  ┌─ Últimas alertas ────────┐ │
│  │                               │  │                           │ │
│  │   [Mapa SVG interactivo]     │  │  🔴 Alta — Vic            │ │
│  │   Color por:                  │  │  Voto contradictorio en   │ │
│  │   ○ Actividad de AC          │  │  presupuesto deportivo    │ │
│  │   ○ Nº de plenos             │  │  hace 2 horas             │ │
│  │   ○ Alertas pendientes       │  │                           │ │
│  │                               │  │  🟡 Media — Manresa      │ │
│  │   Click en municipio →       │  │  Argumento inconsistente  │ │
│  │   ir a ficha municipio       │  │  sobre urbanismo          │ │
│  │                               │  │  hace 1 día              │ │
│  │                               │  │                           │ │
│  │                               │  │  🟢 Baja — Terrassa      │ │
│  │                               │  │  Nuevo tema detectado:    │ │
│  │                               │  │  moción sobre inmigración │ │
│  │                               │  │  hace 3 días             │ │
│  │                               │  │                           │ │
│  └───────────────────────────────┘  └───────────────────────────┘ │
│                                                                  │
│  ┌─ Actividad reciente ─────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Timeline de últimos plenos procesados:                   │   │
│  │                                                           │   │
│  │  📋 Girona — Ple ordinari 28/03/2026                     │   │
│  │     8 puntos · AC votó en contra de 2 · 1 alerta         │   │
│  │                                                           │   │
│  │  📋 Sabadell — Ple extraordinari 25/03/2026              │   │
│  │     3 puntos · AC no presente · sin alertas              │   │
│  │                                                           │   │
│  │  📋 Lleida — Ple ordinari 22/03/2026                     │   │
│  │     12 puntos · AC a favor de 10 · coherente             │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Coherencia del partido ────────┐  ┌─ Temas trending ──────┐ │
│  │                                  │  │                        │ │
│  │  Índice global: 87% ████████░░  │  │  1. Urbanismo    +12%  │ │
│  │                                  │  │  2. Hacienda     +8%   │ │
│  │  Top alineados:                  │  │  3. Seguridad    +5%   │ │
│  │  1. Maria López (Vic) — 98%     │  │  4. Serv.Social  -3%   │ │
│  │  2. Joan Puig (Girona) — 95%    │  │  5. Medio amb.   +2%   │ │
│  │  3. Anna Vidal (Reus) — 93%     │  │                        │ │
│  │                                  │  │  [Ver análisis →]      │ │
│  │  Divergentes:                    │  │                        │ │
│  │  ⚠️  Pere Font (Manresa) — 71%  │  └────────────────────────┘ │
│  │                                  │                            │
│  └──────────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 BUSCADOR — Búsqueda híbrida

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 Buscar en 52.341 actas de 947 municipios                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  pressupost urbanisme Girona                           🔍  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Modo: ● Todo  ○ Votaciones  ○ Argumentos  ○ Acuerdos           │
│                                                                   │
│  Filtros:                                                        │
│  ┌──────────────┐ ┌────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ Municipio  ▼ │ │ Partido  ▼ │ │ Tema    ▼ │ │ Fecha     ▼ │  │
│  │ Girona      │ │ Todos      │ │ Urbanismo │ │ Últ. año    │  │
│  └──────────────┘ └────────────┘ └───────────┘ └─────────────┘  │
│                                                                   │
│  ┌─ Resultados (47 encontrados) ──────────────────────────────┐  │
│  │                                                             │  │
│  │  📋 Ple ordinari — Girona — 15/03/2026                     │  │
│  │  Punt 5: Modificació pressupostària per urbanisme           │  │
│  │  "...aprovació de 250.000€ per la remodelació del casc      │  │
│  │  antic, amb els vots a favor d'ERC i PSC, en contra         │  │
│  │  d'Aliança Catalana per falta de participació veïnal..."    │  │
│  │  ┌────────────────────────────────────────────────────┐     │  │
│  │  │ ✅ ERC  ✅ PSC  ❌ AC  ⬜ CUP (abstenció)         │     │  │
│  │  └────────────────────────────────────────────────────┘     │  │
│  │  Tema: urbanismo · Resultado: aprobado                      │  │
│  │  [Ver acta completa →]  [Ver votación →]                    │  │
│  │                                                             │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │                                                             │  │
│  │  📋 Ple ordinari — Girona — 20/01/2026                     │  │
│  │  Punt 3: Pla d'ordenació urbanística municipal              │  │
│  │  "...debat sobre la revisió del POUM, amb especial          │  │
│  │  atenció a la densificació del barri de Sant Narcís..."     │  │
│  │  [...]                                                      │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Paginación: [1] 2 3 4 5 ... 10  →                              │
└───────────────────────────────────────────────────────────────────┘
```

### 6.4 CHAT — Interfaz tipo NotebookLLM

```
┌──────────────────────────────────────────────────────────────────┐
│  💬 Chat con AjuntamentIA                                        │
│                                                                   │
│  ┌─ Conversación ────────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  👤 ¿Qué posición ha tomado AC sobre urbanismo en los     │   │
│  │     últimos 6 meses?                                       │   │
│  │                                                            │   │
│  │  🤖 En los últimos 6 meses, Aliança Catalana ha mantenido │   │
│  │     una posición mayoritariamente crítica con los planes    │   │
│  │     urbanísticos propuestos por los gobiernos locales.      │   │
│  │                                                            │   │
│  │     **Patrón principal:** En 14 de 18 votaciones sobre     │   │
│  │     urbanismo, los concejales de AC votaron en contra,     │   │
│  │     citando principalmente:                                │   │
│  │     - Falta de participación ciudadana (9 casos)           │   │
│  │     - Impacto medioambiental (5 casos)                     │   │
│  │     - Coste excesivo (4 casos)                             │   │
│  │                                                            │   │
│  │     **Excepciones notables:**                              │   │
│  │     - En Vic (15/02/2026), AC votó a favor del plan de     │   │
│  │       rehabilitación del centro histórico [📋 ver acta]    │   │
│  │     - En Reus (03/03/2026), AC se abstuvo en la            │   │
│  │       modificación del POUM [📋 ver acta]                  │   │
│  │                                                            │   │
│  │     **Incoherencia detectada:** El voto de Vic contradice  │   │
│  │     el patrón general. El argumento fue "preservación del  │   │
│  │     patrimonio" vs. el habitual "falta de participación".  │   │
│  │                                                            │   │
│  │     📊 Fuentes: 18 actas de 12 municipios                 │   │
│  │     📅 Período: octubre 2025 — marzo 2026                 │   │
│  │                                                            │   │
│  │  ─────────────────────────────────────────────────────     │   │
│  │                                                            │   │
│  │  👤 Compara la posición de AC sobre urbanismo con la de    │   │
│  │     ERC en los mismos municipios                           │   │
│  │                                                            │   │
│  │  🤖 [Responde con tabla comparativa, fuentes citadas...]   │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Pregunta sobre las actas...                           ➤  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Sugerencias:                                                    │
│  [¿Qué temas preocupan más en el Maresme?]                      │
│  [¿Qué municipios han aprobado mociones sobre inmigración?]      │
│  [Resume el último pleno de Sabadell]                            │
└───────────────────────────────────────────────────────────────────┘
```

### 6.5 ALERTAS — Panel de coherencia

```
┌──────────────────────────────────────────────────────────────────┐
│  🔔 Alertas de coherencia                    Filtrar: [Todo ▼]  │
│                                                                   │
│  ┌─ Pendientes (12) ────────────────────────────────────────┐    │
│  │                                                           │    │
│  │  🔴 ALTA — Voto contradictorio                           │    │
│  │  ──────────────────────────────────────────────           │    │
│  │  Pere Font (Manresa) votó A FAVOR de modificación        │    │
│  │  presupuestaria de 300.000€ para polideportivo.          │    │
│  │                                                           │    │
│  │  Sin embargo, en los últimos 3 meses:                     │    │
│  │  • Maria López (Vic) → EN CONTRA de modif. similar       │    │
│  │  • Joan Puig (Girona) → EN CONTRA de modif. similar      │    │
│  │  • Anna Vidal (Reus) → ABSTENCIÓN                        │    │
│  │                                                           │    │
│  │  Argumento de Pere Font: "necessitat esportiva urgent"    │    │
│  │  Argumento habitual AC: "manca de transparència"          │    │
│  │                                                           │    │
│  │  📋 Ver acta Manresa  📋 Ver actas similares              │    │
│  │  [Marcar como revisada]  [Resolver]  [Contactar concejal]│    │
│  │                                                           │    │
│  │  ─────────────────────────────────────────────────────    │    │
│  │                                                           │    │
│  │  🟡 MEDIA — Argumento inconsistente                      │    │
│  │  Anna Vidal (Reus) usó argumento "impacto económico"     │    │
│  │  cuando la línea del partido es "participación ciudadana" │    │
│  │  Tema: urbanismo · 25/03/2026                             │    │
│  │  [Marcar como revisada]  [Resolver]                       │    │
│  │                                                           │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─ Estadísticas ──────────────────┐  ┌─ Por concejal ────────┐ │
│  │                                  │  │                        │ │
│  │  Esta semana:                    │  │  Pere Font      3 ⚠️   │ │
│  │  • 3 alertas altas              │  │  Anna Vidal     2 ⚠️   │ │
│  │  • 5 alertas medias             │  │  Marc Serra     1 ⚠️   │ │
│  │  • 4 alertas bajas              │  │  Maria López    0 ✅   │ │
│  │                                  │  │  Joan Puig      0 ✅   │ │
│  │  Tendencia: ▲ +2 vs semana ant.  │  │                        │ │
│  └──────────────────────────────────┘  └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

### 6.6 FICHA DE MUNICIPIO

```
┌──────────────────────────────────────────────────────────────────┐
│  🏛️ Ajuntament de Girona                                        │
│                                                                   │
│  Comarca: Gironès · Provincia: Girona · Población: 103.369       │
│  Alcalde/ssa: [nombre] (ERC) · Último pleno: 15/03/2026         │
│                                                                   │
│  ┌─ Composición del pleno ───────────────────────────────────┐   │
│  │  ERC: 10  │  PSC: 6  │  JxCat: 4  │  AC: 3  │  CUP: 2   │   │
│  │  ████████████  ██████   ████         ███        ██         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Concejales de AC ──────────────┐  ┌─ Actividad ───────────┐ │
│  │                                  │  │                        │ │
│  │  Joan Puig — Regidor             │  │  Plenos 2026: 4       │ │
│  │  Coherencia: 95% ██████████░    │  │  Puntos votados: 38    │ │
│  │  Área: Urbanismo                 │  │  AC a favor: 28 (74%) │ │
│  │  [Ver ficha →]                   │  │  AC en contra: 7 (18%)│ │
│  │                                  │  │  Abstenciones: 3 (8%) │ │
│  │  Marta Solé — Regidora           │  │                        │ │
│  │  Coherencia: 91% █████████░░    │  │  Alertas: 1 media     │ │
│  │  Área: Serveis Socials           │  │                        │ │
│  │  [Ver ficha →]                   │  └────────────────────────┘ │
│  └──────────────────────────────────┘                            │
│                                                                   │
│  ┌─ Últimos plenos ──────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  📋 15/03/2026 — Ordinari — 8 puntos                     │   │
│  │     Temas: urbanismo, hacienda, cultura                    │   │
│  │     AC: 5 a favor · 2 en contra · 1 abstención            │   │
│  │     [Ver detalle →]                                        │   │
│  │                                                            │   │
│  │  📋 20/01/2026 — Ordinari — 11 puntos                    │   │
│  │     Temas: urbanismo, seguridad, medio ambiente            │   │
│  │     AC: 8 a favor · 3 en contra                            │   │
│  │     [Ver detalle →]                                        │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Temas más debatidos ────────────┐  ┌─ Evolución temporal ─┐ │
│  │  [gráfico barras horizontales]   │  │  [gráfico líneas     │ │
│  │  Urbanismo:     ████████ 12     │  │   nº plenos/mes      │ │
│  │  Hacienda:      ██████ 9        │  │   alertas/mes        │ │
│  │  Seguridad:     ████ 6          │  │   coherencia/mes]    │ │
│  │  Medio amb.:    ███ 5            │  │                       │ │
│  │  Cultura:       ██ 3             │  │                       │ │
│  └──────────────────────────────────┘  └───────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

### 6.7 FICHA DE ACTA (detalle de un pleno)

```
┌──────────────────────────────────────────────────────────────────┐
│  📋 Acta del Ple — Girona — 15/03/2026                          │
│  Tipus: Ordinari · Hora: 19:00-21:30 · 8 puntos                │
│  [Descargar PDF original]                                        │
│                                                                   │
│  ┌─ Asistentes ──────────────────────────────────────────────┐   │
│  │  ✅ Joan Puig (AC)  ✅ Marta Solé (AC)  ✅ Pere Vila (AC) │   │
│  │  ✅ [alcalde] (ERC) ✅ ... (PSC) ❌ [ausente] (CUP)      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Puntos del orden del día ────────────────────────────────┐   │
│  │                                                            │   │
│  │  1. Aprovació acta anterior                    ✅ Unànime  │   │
│  │     Tema: procedimiento                                    │   │
│  │                                                            │   │
│  │  2. Donació de compte dels decrets d'Alcaldia  ✅ Unànime  │   │
│  │     Tema: procedimiento                                    │   │
│  │                                                            │   │
│  │  3. Aprovació modificació pressupostària 2/2026            │   │
│  │     Tema: hacienda · Resultado: APROBADO                   │   │
│  │     ┌────────────────────────────────────────────┐         │   │
│  │     │  A favor    │ En contra  │ Abstención      │         │   │
│  │     │  ERC (10)   │ AC (3)     │ CUP (2)         │         │   │
│  │     │  PSC (6)    │            │                  │         │   │
│  │     │  JxCat (4)  │            │                  │         │   │
│  │     └────────────────────────────────────────────┘         │   │
│  │     📝 Resumen: Modificación de 250.000€ para obras       │   │
│  │     en el polideportivo municipal.                         │   │
│  │                                                            │   │
│  │     💬 Argumentos:                                         │   │
│  │     • AC (en contra): "Manca de transparència en la       │   │
│  │       licitació i absència de participació veïnal"         │   │
│  │     • ERC (a favor): "Necessitat urgent de renovació       │   │
│  │       de les instal·lacions esportives"                    │   │
│  │                                                            │   │
│  │     ⚠️ ALERTA: Este voto es coherente con la línea de AC  │   │
│  │     (en contra de modif. presupuestarias sin transparencia)│   │
│  │                                                            │   │
│  │  4. Moció sobre seguretat ciutadana                        │   │
│  │     [expandir...]                                          │   │
│  │                                                            │   │
│  │  5-8. [más puntos...]                                      │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Ruegos y preguntas ──────────────────────────────────────┐   │
│  │  • Joan Puig (AC): Pregunta sobre estado de las obras     │   │
│  │    del parque central — Tema: urbanismo                    │   │
│  │  • [más...]                                                │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### 6.8 INFORMES

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Informes                                                      │
│                                                                   │
│  ┌─ Informe semanal automático ──────────────────────────────┐   │
│  │                                                            │   │
│  │  Semana 24/03 — 30/03/2026                                │   │
│  │                                                            │   │
│  │  Resumen ejecutivo:                                        │   │
│  │  Se celebraron 47 plenos en municipios monitorizados.      │   │
│  │  AC participó en 8 de ellos. Se detectaron 3 alertas       │   │
│  │  de coherencia (1 alta, 2 medias). El tema dominante       │   │
│  │  fue urbanismo (32% de los puntos votados).                │   │
│  │                                                            │   │
│  │  [Leer completo →]  [Descargar PDF]  [Enviar por email]   │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Generar informe personalizado ───────────────────────────┐   │
│  │                                                            │   │
│  │  Tipo:       [Coherencia ▼]                                │   │
│  │  Período:    [Último mes ▼]                                │   │
│  │  Municipios: [Todos donde AC tiene presencia ▼]            │   │
│  │  Temas:      [Todos ▼]                                     │   │
│  │                                                            │   │
│  │  [Generar informe]                                         │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Historial de informes ───────────────────────────────────┐   │
│  │  📄 Semanal — 24/03/2026  [Ver] [PDF]                    │   │
│  │  📄 Semanal — 17/03/2026  [Ver] [PDF]                    │   │
│  │  📄 Mensual — Febrero 2026  [Ver] [PDF]                   │   │
│  │  📄 Custom — Coherencia urbanismo Q1 2026  [Ver] [PDF]    │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### 6.9 SETTINGS — Configuración

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚙️ Configuración                                                │
│                                                                   │
│  ┌─ Línea del partido ───────────────────────────────────────┐   │
│  │                                                            │   │
│  │  Define las posiciones oficiales del partido por tema.     │   │
│  │  Se usan para detectar incoherencias.                      │   │
│  │                                                            │   │
│  │  Tema              Posición    Descripción                 │   │
│  │  ─────────────────────────────────────────────────         │   │
│  │  Urbanismo         En contra   Sin participación vecinal   │   │
│  │  Presup. extraord. En contra   Falta de transparencia      │   │
│  │  Inmigración       A favor     Mociones de control          │   │
│  │  Medio ambiente    A favor     Políticas verdes             │   │
│  │                                                            │   │
│  │  [+ Añadir posición]                                       │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Notificaciones ──────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  Telegram:                                                 │   │
│  │  ☑ Alertas altas → inmediato                              │   │
│  │  ☑ Alertas medias → resumen diario                        │   │
│  │  ☐ Alertas bajas                                           │   │
│  │  ☑ Informe semanal → lunes 8:00                           │   │
│  │                                                            │   │
│  │  Email:                                                    │   │
│  │  ☑ Informe semanal                                        │   │
│  │  ☐ Alertas altas                                           │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Usuarios ────────────────────────────────────────────────┐   │
│  │  admin@aliancacatalana.cat          Admin    [Editar]      │   │
│  │  comunicacio@aliancacatalana.cat    Editor   [Editar]      │   │
│  │  territorial@aliancacatalana.cat    Viewer   [Editar]      │   │
│  │  [+ Invitar usuario]                                       │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 7. Stack tecnológico definitivo

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind + shadcn/ui | SSR, components profesionales, ya lo dominas |
| **Mapas** | D3.js + TopoJSON Catalunya | Mapa SVG interactivo, sin dependencias externas |
| **Gráficos** | Recharts o Tremor | Integración limpia con React |
| **Auth** | Supabase Auth (magic link) | Ya corriendo, zero config |
| **API Backend** | FastAPI (Python) | Ecosistema ML, async, tipado |
| **Base de datos** | Supabase PostgreSQL 15 | Ya corriendo, full-text, JSONB |
| **Vector DB** | Qdrant | Ya corriendo, performante |
| **LLM bulk** | GPT-5.4-mini vía OpenClaw | Barato, rápido, suficiente para extracción |
| **LLM smart** | GPT-5.4 vía OpenClaw | Razonamiento profundo para coherencia y Q&A |
| **PDF** | pdfplumber + Tesseract | Nativos + OCR cubiertos |
| **Cola** | Celery + Redis | Workers distribuidos, reintentos |
| **Bot** | python-telegram-bot v20 | Async, bien mantenido |
| **Storage** | Supabase Storage (MinIO) | PDFs originales, ya corriendo |
| **Cron** | Celery Beat | Scheduling integrado con la cola |
| **Deploy** | Docker Compose en el servidor | Simple, todo en un solo host |

---

## 8. Cronograma — 8 semanas hasta producción

> Ajustado para: backfill en 3 semanas (suave, ~1.7 actas/min),
> desarrollo web con diseño cuidado, y buffer para iteración.

### FASE A: Datos (Semanas 1-3)

#### Semana 1 — Fundamentos + Pipeline

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 14/04 | Repo + Docker Compose + esquema SQL en Supabase | Infraestructura base |
| M 15/04 | Ingesta Municat (Socrata) → municipios + cargos_electos | 947 municipios + 10.591 cargos |
| M 15/04 | Ingesta seu-e.cat (CKAN CSV) → catálogo de actas | 138K registros |
| X 16/04 | Identificar concejales AC + prioridades | Mapa de municipios AC |
| X 16/04 | Descargador de PDFs con cola (Celery + Redis) | Worker de descarga |
| J 17/04 | Extractor de texto (pdfplumber + fallback OCR) | Worker de extracción |
| V 18/04 | Prompt engineering + integración OpenClaw (GPT-5.4-mini) | Estructuración LLM |
| V 18/04 | Test con 100 actas reales: download → extract → structure | Validación pipeline |

**Hito:** Pipeline completo probado con datos reales.

#### Semana 2 — Backfill arranca + API base

| Día | Tarea | Resultado |
|-----|-------|-----------|
| **L 21/04** | **BACKFILL ARRANCA** — prioridad: municipios AC | ~2.400 actas/día |
| L 21/04 | FastAPI: /actas, /municipios, /cargos, /stats | CRUD básico |
| M 22/04 | Búsqueda full-text (PostgreSQL tsvector) | /search keyword |
| M 22/04 | Embeddings → Qdrant (collection ayuntamentia_puntos) | /search semántico |
| X 23/04 | Endpoint /chat — RAG con GPT-5.4 | Q&A funcional |
| J 24/04 | Supabase Auth + middleware JWT en FastAPI | Auth lista |
| V 25/04 | Crons: sync CKAN cada 6h + sync Municat semanal | Ingesta automática |

**Hito:** API funcional. Backfill ~30% (~16K actas).

#### Semana 3 — Coherencia + Backfill continúa

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 28/04 | Modelo línea del partido (CRUD API) | Gestión posiciones |
| M 29/04 | Detector coherencia v1: comparar votaciones AC por tema | Alertas generadas |
| X 30/04 | Comparador semántico (Qdrant similarity + LLM validation) | Matching inteligente |
| J 01/05 | Sistema de alertas (crear, severidad, notificar) | /alertas API |
| V 02/05 | Informe semanal auto (GPT-5.4 genera resumen ejecutivo) | /informes API |

**Hito:** Motor coherencia funcional. Backfill ~65% (~33K actas).

### FASE B: Web (Semanas 4-5)

#### Semana 4 — Frontend core

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 05/05 | Next.js setup + Supabase Auth + layout + navegación | Esqueleto web |
| L 05/05 | Dashboard: stats cards + mapa Catalunya (D3 + TopoJSON) | Home page |
| M 06/05 | Buscador: input + filtros + resultados paginados | Búsqueda web |
| X 07/05 | Chat conversacional: interfaz streaming + sugerencias | Chat Q&A |
| J 08/05 | Panel alertas: listado + filtros + acciones (revisar/resolver) | Alertas web |
| V 09/05 | Ficha de acta: puntos, votaciones, argumentos, PDF link | Detalle acta |

**Hito:** Web navegable con dashboard, búsqueda, chat y alertas.

#### Semana 5 — Frontend completo

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 12/05 | Ficha municipio: composición, histórico, tendencias | Vista municipio |
| M 13/05 | Ficha concejal: votaciones, coherencia, ranking | Vista concejal |
| X 14/05 | Informes: semanal + generador personalizado + historial | Vista informes |
| J 15/05 | Settings: línea partido + notificaciones + usuarios | Configuración |
| V 16/05 | Responsive + dark mode + pulido UI | Web lista |

**Hito:** Web completa. Backfill ~100% (~50K actas).

### FASE C: Telegram + Entrega (Semanas 6-8)

#### Semana 6 — Telegram

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 19/05 | Bot setup + /buscar + /municipio | Búsqueda en Telegram |
| M 20/05 | /alertas + push notifications (alertas altas → inmediato) | Alertas Telegram |
| X 21/05 | Chat libre en Telegram (Q&A con GPT-5.4) | Chat Telegram |
| J 22/05 | /informe semanal + /resumen [municipio] | Informes Telegram |
| V 23/05 | Canal de noticias: publicación automática de alertas | Canal activo |

**Hito:** Telegram completo.

#### Semana 7 — Testing + optimización

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 26/05 | E2E: ingesta → análisis → alerta → Telegram + web | Pipeline validado |
| M 27/05 | Performance: cache en API, lazy loading web, query tuning | Optimizado |
| X 28/05 | Calidad datos: revisar quality_score, mejorar prompts | Datos refinados |
| J 29/05 | Seguridad: RLS en Supabase, rate limits API, sanitización | Seguro |
| V 30/05 | Demo interna + recoger feedback | Lista de ajustes |

**Hito:** Sistema robusto y testeado.

#### Semana 8 — Iteración + entrega

| Día | Tarea | Resultado |
|-----|-------|-----------|
| L 02/06 | Ajustes basados en feedback de demo | Iterado |
| M 03/06 | Documentación: guía usuario web + Telegram | Manual |
| X 04/06 | Onboarding: crear cuentas, cargar línea partido inicial | Datos iniciales |
| J 05/06 | **DEMO AL CLIENTE** | Presentación |
| V 06/06 | **GO LIVE** | Producción |

---

## 9. Modelo de datos (sin cambios, ver sección 5 del plan anterior)

El esquema SQL completo está en `docs/ESTRATEGIA_DATOS.md` y se implementará
como migración de Supabase en el día 1 de la semana 1.

---

## 10. Riesgos y mitigaciones

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|--------|-------|---------|------------|
| 1 | PDFs escaneados → OCR falla | Media | Alto | Detectar <200 chars, Tesseract catalán, flag revisión manual |
| 2 | Formatos de acta muy diferentes | Alta | Medio | Prompt flexible, quality_score, iteración semana 7 |
| 3 | OpenClaw saturado con backfill | Baja | Alto | Solo 2 slots de 8. Ritmo suave (1.7/min). Backoff. |
| 4 | Barcelona sin datos en seu-e.cat | Cierta | Medio | BCNROC vía OAI-PMH como fuente alternativa |
| 5 | Nombres de concejales inconsistentes | Alta | Medio | Fuzzy matching Levenshtein + cache de mapeos |
| 6 | CKAN API caída/cambio | Baja | Alto | CSV backup, retry backoff, alerta si >24h |
| 7 | AC tiene pocos concejales | Media | Alto | Valor en inteligencia competitiva sobre otros partidos |
| 8 | Backfill no termina en 3 semanas | Baja | Medio | Margen de semana 7 para catch-up. Prioridad AC primero. |
| 9 | Chat Q&A genera respuestas incorrectas | Media | Alto | RAG con fuentes citadas, disclaimer, feedback loop |

---

## 11. Qué necesitamos del cliente

| # | Qué | Para qué | Cuándo |
|---|-----|----------|--------|
| 1 | Municipios donde AC tiene concejales | Priorizar backfill | **Antes de empezar** |
| 2 | Nombre del partido en actas (variaciones) | Matching | **Antes de empezar** |
| 3 | Posiciones oficiales por tema | Motor coherencia | Semana 3 |
| 4 | Taxonomía de temas prioritarios | Clasificación | Semana 3 |
| 5 | Token bot Telegram (@BotFather) | Bot | Semana 6 |
| 6 | Emails de usuarios | Auth | Semana 5 |
| 7 | Feedback sobre demo | Iteración | Semana 7 |
| 8 | Logo / identidad visual | Branding web | Semana 4 |

---

## 12. Roadmap post-entrega

### Fase 2: Inteligencia competitiva (semanas 9-12)
- Dashboard multi-partido
- Contradicciones discurso nacional vs. acción municipal de rivales
- Tendencias territoriales por comarca

### Fase 3: Contenido y comunicación (semanas 13-16)
- Generador de notas de prensa desde datos
- Contenido localizado RRSS: "en tu municipio votaron X"
- Tracker de promesas incumplidas

### Fase 4: SaaS (semana 17+)
- Multi-tenant para otros partidos
- Versión para periodistas/investigadores
- API pública de pago
