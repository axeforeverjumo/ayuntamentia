# SPEC — Sala d'Intel·ligència

## 2025-02-14 — Retrieval dual plens + premsa amb graceful degradation

### Objectiu
Implementar un servei backend de retrieval dual per a Sala d'Intel·ligència que consulti en paral·lel dues fonts ja existents del projecte:
- plens municipals (`actas` / `puntos_pleno`)
- premsa (`premsa_articles`)

La sortida queda preparada per alimentar una futura capa generadora, però aquesta iteració **no** genera resposta final LLM.

### Arxius modificats
- `api/src/services/intelligence_retrieval_service.py`
- `api/src/services/premsa_retrieval.py`
- `api/src/routes/intel.py`
- `api/src/services/__init__.py`
- `api/tests/test_dual_retrieval.py`
- `specs/intelligence/SPEC.md`

### Context del repo auditado abans d'implementar
S'ha ajustat el pla inicial perquè el repositori real **no** conté la ruta `backend/` indicada al handoff, sinó `api/` per al backend FastAPI. També s'ha verificat que:
- el mòdul d'intel existent és `api/src/routes/intel.py`
- l'accés a BD reutilitzable ja existeix a `api/src/db.py`
- la font de premsa reutilitzable es basa en la taula `premsa_articles` definida/assegurada des de `api/src/routes/reputacio.py`
- no existeix al repo un servei backend previ específic de vector store de plens dins `api/src/services/`, així que la implementació reutilitza l'esquema real de `actas`, `puntos_pleno`, `municipios`, `votaciones` i `argumentos` sense crear una capa duplicada paral·lela

### Disseny implementat
S'afegeix `IntelligenceRetrievalService` amb mètodes principals asíncrons `retrieve(query, context)` i `dual_retrieve(query, context)` que:
1. accepta consulta i context (`tenant`, `municipio`, `comarca`, `partido`, `limit_per_source`)
2. dispara retrieval de plens i premsa en paral·lel amb `asyncio.gather(..., return_exceptions=True)`
3. aplica reranking explicable per font
4. retorna context separat:
   - `plens_context[]`
   - `premsa_context[]`
5. afegeix metadades i flag de degradació

### Fonts consultades
#### 1) Plens
Consulta SQL sobre:
- `puntos_pleno`
- `actas`
- `municipios`
- filtres contextuals opcionals amb subconsultes sobre `votaciones` i `argumentos` quan hi ha `partido`

Estratègia de recuperació:
- si la query té termes útils, es genera `to_tsquery('spanish', ...)` contra `actas.tsv`
- es prioritza també `p.fecha DESC`
- es permet restringir per `municipio`, `comarca` i `partido`

#### 2) Premsa
S'extreu la lògica a `api/src/services/premsa_retrieval.py` amb una consulta SQL sobre `premsa_articles` amb suport a:
- text en `titol` i `resum`
- arrays `temes[]`
- arrays `partits[]`
- `sentiment`
- `sentiment_score`
- `data_publicacio` (`date_from` / `date_to`)

El contracte de filtres queda encapsulat a `PremsaRetrievalFilters`. La consulta limita candidats, filtra per temes/partits/sentiment/data quan s'indica i ordena inicialment per `data_publicacio DESC`; el reranking posterior és el que consolida prioritat final.

### Fórmula de reranking
Per cada candidat es construeix un `score_breakdown` explícit amb:
- `relevance`
- `recency_bonus`
- `context_bonus`
- `final_score`

Fórmula documentada:
`score = relevance + recency_bonus + context_bonus`

#### Components
- `relevance`: proporció de termes de la query presents en el text candidat
- `recency_bonus`: funció simple decreixent per antiguitat fins a 365 dies
- `context_bonus`: bonus acumulatiu si coincideix amb municipi, comarca, partit o tenant contextual

#### Explicabilitat
Cada ítem retornat incorpora:
- `source`
- `score_breakdown.formula`
- valors numèrics de cada component

Això permet depurar per què un resultat queda per davant d'un altre sense dependre d'un model extern de pagament.

### Graceful degradation
Comportament implementat:
- si falla `premsa`, el servei **no** cau
- es registren logs `warning`
- es retorna resposta vàlida amb:
  - `plens_context[]` poblada
  - `premsa_context[]` buit
  - `degraded = true`
  - `degradation_reasons = ["premsa_unavailable"]`
- si falla `plens`, el servei eleva error perquè aquesta font és base obligatòria per al retrieval de Sala
- si fallen totes dues fonts, també s'eleva error i es logueja `intel_retrieval.all_sources_failed`

#### Prioritats operatives del fallback
1. **Plens és la font primària**: sense `plens_context[]` no es considera recuperació mínima vàlida.
2. **Premsa és font complementària degradable**: pot desaparèixer sense tallar la resposta si plens ha resolt correctament.
3. **El contracte d'errors HTTP és terminal només quan falla plens**: la degradació de premsa es reflecteix dins el payload 200, no com error de transport.

#### Contracte d'errors esperats
- `200 OK` + `degraded=false`: les dues fonts han respost i s'han rerankejat.
- `200 OK` + `degraded=true` + `degradation_reasons=["premsa_unavailable"]`: plens disponible, premsa fallida o timeout.
- `503 intel_retrieval_unavailable`: fallada de plens o fallada simultània de totes dues fonts.

A nivell HTTP, `POST /api/intel/retrieval` captura aquest error terminal, el logueja i respon `503 intel_retrieval_unavailable`.

### Observabilitat
S'han afegit logs estructurats amb:
- latència per font
- latència total
- candidats recuperats per font
- resultats finals després de reranking per font
- warning específic quan premsa falla

Missatges principals:
- `intel_retrieval.source ...`
- `intel_retrieval.premsa_failed ...`
- `intel_retrieval.completed ...`

### Contracte de sortida
Resposta del servei / endpoint:
- `query`
- `context`
- `plens_context[]`
- `premsa_context[]`
- `degraded`
- `degradation_reasons[]`
- `diagnostics.latency_ms`
- `diagnostics.sources.plens.{latency_ms,candidates,final}`
- `diagnostics.sources.premsa.{latency_ms,candidates,final}`
- `diagnostics.reranking_formula`
- `meta` (alias retrocompatible amb el mateix contingut de `diagnostics`)

### Endpoint exposat
S'afegeix `POST /api/intel/retrieval` amb payload:
```json
{
  "query": "seguretat ripoll",
  "tenant": "AC",
  "municipio": "Ripoll",
  "comarca": "Ripollès",
  "partido": "AC",
  "limit_per_source": 5,
  "temes": ["seguretat"],
  "partits": ["AC"],
  "sentiment": "positiu",
  "date_from": "2024-01-01",
  "date_to": "2025-12-31"
}
```

L'endpoint només retorna estructura de retrieval; no sintetitza resposta final ni crida cap LLM.

### Tests afegits
`api/tests/test_dual_retrieval.py` cobreix:
1. cas normal amb dues fonts i verificació de contextos separats
2. verificació de paral·lelisme funcional mitjançant dues coroutines amb mateixa latència simulada
3. verificació que la recència altera l'ordre en almenys un escenari
4. cas de fallada de premsa amb `degraded=True`
5. cas de fallada de plens amb excepció terminal
6. cas de fallada simultània de plens + premsa
7. endpoint `/api/intel/retrieval` cablejat correctament
8. endpoint retornant payload degradat end-to-end amb `200 OK`
9. endpoint retornant `503` quan el servei falla
10. wiring de filtres de premsa (`temes`, `partits`, `sentiment`, dates) fins al context de retrieval

### Nota sobre test relacionat preexistent
S'ha ajustat mínimament `api/tests/test_intelligence_retrieval.py` perquè ja existia al repo amb un error de sintaxi (`await` fora d'una funció async), la qual cosa impedia fins i tot col·leccionar els tests relacionats del mòdul. El canvi ha estat només de sanejament per fer executable la suite existent, sense ampliar-ne abast funcional.

### Evidència de validació
- `pytest api/tests/test_dual_retrieval.py`
- `python -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`

### Decisions tècniques
- S'ha reutilitzat `api/src/db.py` per l'accés a PostgreSQL existent.
- No s'ha creat una nova capa d'accés a dades fora de l'estil actual del backend.
- El brief parlava de "vector store de plens ja existent", però al backend inspeccionat no hi ha cap servei/ruta reutilitzable de vector search per plens dins `api/src/`; per tant s'ha implementat recuperació híbrida simple basada en full-text search sobre `actas.tsv` + joins amb `puntos_pleno`.
- Es manté la lògica de retrieval separada del generador final per respectar l'abast de la spec-007.

### Limitacions obertes
- `premsa_articles.temes[]` existeix al model runtime de reputació però no s'ha verificat una migració SQL equivalent dins `supabase/migrations/`; aquesta iteració assumeix l'esquema operatiu ja present a entorn.
- El reranking és intencionadament senzill i explicable; no incorpora embeddings ni cross-encoder.
- La recuperació de plens usa `actas.tsv` en espanyol perquè és el que existeix actualment a l'esquema base.
