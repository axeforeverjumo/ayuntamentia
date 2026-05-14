# SPEC — Dashboard

## 2026-05-09 — Eliminació del bloc "intel stream" del dashboard

### Canvis realitzats
- S'ha eliminat del dashboard el bloc visual final relacionat amb la Sala d'Intel·ligència (CTA i accessos ràpids), que era la presència associada a l'"intel stream" en aquesta pantalla.
- S'ha verificat que no quedin referències visuals o de navegació a aquest bloc dins de `dashboard/page.tsx`.
- S'han netejat imports que quedaven sense ús després de l'eliminació del bloc.

### Arxius modificats
1. `web/src/app/dashboard/page.tsx`
   - Eliminat el bloc complet de la fila final (CTA de Sala d'Intel·ligència) que incloïa:
     - badge i copy de "SALA D'INTEL·LIGÈNCIA"
     - enllaços de preguntes suggerides
     - botó principal d'obertura cap al xat/sala
   - Eliminat `StatusBadge` de l'import de `StatusBadge.tsx`.
   - Eliminat `APP_ROUTES` de l'import de `@/lib/routes`.

2. `specs/dashboard/SPEC.md`
   - Creat/actualitzat amb el registre d'aquesta intervenció.

### Decisions tècniques
- S'ha aplicat un canvi mínim i quirúrgic només a la vista del dashboard per complir l'abast del brief.
- No s'han tocat altres pantalles (`/intel`, `/sala-intelligencia`, etc.) perquè la petició era exclusivament sobre la presència del bloc al dashboard.

### Verificació
- Build frontend executada amb èxit:
  - `npm --prefix web run build`
  - Resultat: compilació correcta i ruta `/dashboard` generada sense errors.

## 2026-05-09 — Disseny d'ingesta de vídeos de plens per a tendències

### Canvis realitzats
- S'ha consolidat al repositori un document de disseny per definir la nova font de vídeos de plens com a entrada analítica per a tendències i intel.
- S'han deixat especificades les etapes demanades al brief: captura del vídeo, transcripció, revisió/QA i extracció-assimilació de temes.
- S'ha documentat com aquesta font s'hauria d'integrar amb el càlcul de tendències del dashboard i amb la capa d'intel, sense reintroduir el bloc d'`intel stream` al dashboard.
- S'han fixat criteris mínims de qualitat per decidir quan una transcripció és apta per entrar en anàlisi.

### Arxius modificats
- `specs/dashboard/video-plens-ingesta-tendencies.md`
- `specs/dashboard/SPEC.md`

### Decisions tècniques
- La tasca s'ha tractat com a **exploració**: no s'han fet canvis en codi de producció (`api/`, `web/`, `pipeline/`, `supabase/`).
- El disseny pren com a base l'arquitectura existent del repositori:
  - `api/src/routes/dashboard.py` per al càlcul actual de tendències,
  - `api/src/routes/intel.py` per al consum analític a intel,
  - `pipeline/src/workers/tasks.py` com a patró d'orquestració d'ingestes.
- La font vídeo queda definida com a font **complementària** a les actes, amb política explícita per evitar doble recompte quan acta i vídeo corresponen al mateix ple.
- El dashboard hauria de consumir només agregats i mètriques derivades del vídeo, mai la transcripció crua directament.

### Verificació
- Es tracta d'una intervenció documental; no s'han executat build ni lint de frontend/backend perquè no s'ha modificat codi d'aplicació.
- S'ha verificat la presència dels arxius de spec i del document de disseny dins `specs/dashboard/`.

## 2026-05-14 — Ocultació temporal del watermark/attribution de Leaflet al mapa de Catalunya

### Canvis realitzats
- S'ha aplicat un canvi mínim al component del mapa de Catalunya per ocultar la marca d'aigua/attribution visible de Leaflet.
- S'ha configurat la inicialització del mapa amb `attributionControl: false` i s'hi ha afegit un comentari tècnic curt indicant que és una decisió temporal pendent de validació legal/comercial.
- No s'han modificat ni la càrrega de punts ni la configuració de tiles.

### Arxius modificats
1. `web/src/components/features/MapaCatalunyaLeaflet.tsx`
   - Canvi a la creació del mapa Leaflet:
     - de `attributionControl: true`
     - a `attributionControl: false` amb comentari temporal legal/comercial.

2. `specs/dashboard/SPEC.md`
   - Afegida aquesta entrada de registre al final del document.

### Decisions tècniques
- Canvi estrictament local, sense tocar backend ni rutes.
- Es manté intacte el `fetch` de punts (`/api/municipios/geo/points`) i la capa de tiles CARTO/OSM tal com estava, per evitar regressions funcionals.
- L'ocultació d'attribution queda marcada explícitament com a temporal fins a validació legal/comercial.

### Verificació
- Validació de codi amb lint frontend (execució real):
  - `npm --prefix web run lint`
- Validació d'abast del canvi (execució real):
  - `git diff -- web/src/components/features/MapaCatalunyaLeaflet.tsx specs/dashboard/SPEC.md`

## 2026-05-14 — Servei backend pur per al càlcul de `trending_score`

### Canvis realitzats
- S'ha consolidat un servei backend pur i reutilitzable a `api/src/services/trending_score_service.py` per calcular el `trending_score` per tema sense tocar cap endpoint HTTP.
- El càlcul reutilitza dades existents de:
  - `temas_trend_signals` com a font preferent per a `delta_plens` si disposa de comptadors agregats de finestres de 14 dies.
  - `puntos_pleno` com a fallback per derivar `delta_plens` quan la font agregada no està disponible o no retorna files.
  - `premsa_articles` per calcular `score_premsa` sobre els últims 7 dies expandint `temes`.
  - `temas_trend_signals.nivel_mediatico_redes` com a lectura opcional de xarxes; si no hi ha dades útils, el servei continua amb `score_xarxes = 0`.
- S'ha separat explícitament:
  - `base_score`: score combinat amb pesos de configuració, sense penalització editorial.
  - `widget_trending_score`: score destinat només al widget de tendències, aplicant el multiplicador editorial.
- S'ha afegit `api/src/services/editorial_config_service.py` com a helper mínim per llegir i normalitzar el JSON auditable de configuració des d'`alertas_reglas`, amb fallback segur al default documentat.
- S'han actualitzat els tests unitaris a `api/tests/test_trending_score_service.py` per cobrir càlcul base, penalització de `Hisenda`, absència de xarxes i fallback davant configuració invàlida de BD.

### Fórmula i finestres temporals
- `delta_plens = max(plens_ultims_14d - plens_14d_anteriors, 0 després del clamp global del score final)`.
  - El delta pot ser negatiu a nivell de component si hi ha pèrdua de tracció.
  - El tractament actual evita scores finals negatius aplicant `clamp_non_negative` després de combinar pesos i també després d'aplicar la penalització del widget.
- `score_premsa = recompte simple d'articles/premsa vinculats al tema en els últims 7 dies`.
- `score_xarxes = nivell de xarxes existent o 0 si no hi ha dades`.
- `base_score = w_delta_plens * delta_plens + w_premsa * score_premsa + w_xarxes * score_xarxes`, amb pesos provinents del JSON auditable.
- `widget_trending_score = max(base_score * penalty_multiplier, 0)`.

### Prioritat de fonts per a `delta_plens`
1. `temas_trend_signals` si conté agregats `last_14d_mentions` i `previous_14d_mentions`.
2. `puntos_pleno` com a derivació per dates (`últims 14 dies` vs `14 anteriors`) si la lectura anterior no retorna dades.

Aquesta prioritat permet reutilitzar agregats si ja existeixen i mantenir un fallback funcional sense dependència d'endpoints nous.

### Configuració auditable i fallback
- La configuració es llegeix des de `alertas_reglas.trending_config_json`, amb metadades d'auditoria `trending_config_updated_at` i `trending_config_updated_by`.
- El normalitzador exigeix:
  - `weights.delta_plens`
  - `weights.score_premsa`
  - `weights.score_xarxes`
  - `penalties.default`
- Si el JSON no existeix, és invàlid o no compleix l'estructura mínima, el servei fa fallback a:
  - `weights = {delta_plens: 0.6, score_premsa: 0.4, score_xarxes: 0.0}`
  - `penalties = {Hisenda: 0.30, RRHH: 0.40, Urbanisme rutinari: 0.50, default: 0.80}`
- El payload de config retorna `meta.source` per fer explícit si s'ha usat `database`, `fallback_default` o `fallback_invalid_database_config`.

### Abast exacte de la penalització editorial
- La penalització editorial **només** s'aplica a `widget_trending_score`.
- `base_score` queda intacte per permetre reutilització del servei en altres rànquings interns, jobs de Celery o lectures analítiques sense contaminar la mètrica base.
- Això evita redefinir altres rankings del sistema i compleix la separació pedida a la spec.

### Arxius modificats
1. `api/src/services/trending_score_service.py`
   - Refactor del servei existent perquè delegui la lectura/normalització del JSON a un helper reutilitzable.
   - Contracte de sortida alineat amb `base_score` i `widget_trending_score`.
   - Fallback de fonts per a `delta_plens` i lectura opcional de xarxes.
2. `api/src/services/editorial_config_service.py`
   - Nou helper mínim dins la carpeta de serveis existent, sense tocar `api/src/routes/`.
   - Lectura auditable de config + normalització del JSON.
3. `api/src/services/__init__.py`
   - Export del servei de trending per seguir la convenció ja usada al paquet.
4. `api/tests/test_trending_score_service.py`
   - Tests unitaris purs amb fixtures de dicts i monkeypatch del lector de configuració.
5. `specs/dashboard/SPEC.md`
   - Afegida aquesta secció tècnica.

### Reutilització des de Celery o lectura interna
- El servei es pot reutilitzar des de jobs o capes de lectura internes cridant:
  - `trending_score_service.calculate_scores(...)` si ja es disposa de dades agregades en memòria.
  - `trending_score_service.calculate_from_existing_data()` si es vol lectura directa des de BD amb les finestres estàndard.
- No s'ha modificat cap endpoint HTTP en aquesta iteració.

### Verificació
- Tests específics executats sobre el servei:
  - `pytest api/tests/test_trending_score_service.py`
- Sintaxi Python global executada:
  - `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`
