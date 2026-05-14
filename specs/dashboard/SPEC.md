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

## 2026-05-14 — Lectura backend del banner de reunions properes des d'`alertas_reglas`

### Canvis realitzats
- S'ha integrat la lectura del banner de reunions properes sobre l'endpoint de dashboard ja existent (`GET /api/dashboard/`) sense afegir endpoints nous innecessaris.
- El càlcul reutilitza `alertas_reglas` a través del servei existent `api/src/services/alertas_reglas_service.py`, filtrant regles actives de tipus `meeting_upcoming` per a l'usuari actual i els seus municipis.
- El servei de dashboard construeix un payload retrocompatible amb un camp opcional `upcoming_meetings_banner` que inclou: títol, municipi, `meeting_at`, `last_processed_at`, `status`, missatge curt en català i llistat complet de reunions afectades.
- La degradació controlada omet només regles incompletes (per exemple, sense `meeting_at` o sense municipi resolt) i escriu `warning` a logs en lloc de provocar error 500.
- S'han ajustat els tests perquè validin els casos `warning`, `danger`, sense alerta, degradació per dades parcials i la forma del payload servit per l'endpoint agregat.

### Arxius modificats
1. `api/src/routes/dashboard.py`
   - Afegit `GET /api/dashboard/` sobre el router ja existent.
   - Injecció de `CurrentUser` via `get_current_user` i delegació a `dashboard_service.get_dashboard_payload(...)`.
2. `api/src/services/dashboard_service.py`
   - Manteniment del servei real existent, sense crear mòduls nous no cablejats.
   - Centralització dels llindars MVP a `MVP_MEETING_STATUS_THRESHOLDS`.
   - Construcció del banner `upcoming_meetings_banner` amb estat `warning`/`danger`, missatges en català i ordenació per severitat i data.
   - Degradació amb logs davant regles incompletes.
3. `api/tests/test_dashboard.py`
   - Tests de càlcul del banner i del payload agregat de l'endpoint.
   - Verificació explícita dels llindars centralitzats i del camp opcional retornat.
4. `specs/dashboard/SPEC.md`
   - Afegit aquest registre tècnic.

### Llindars MVP definits
- `warning_hours = 72`
- `danger_hours = 24`

### Decisió de retrocompatibilitat del payload
- El dashboard continua retornant un objecte JSON i només s'hi afegeix la clau opcional `upcoming_meetings_banner`.
- Si no hi ha cap reunió rellevant dins dels llindars o totes les regles són invàlides/incompletes, el camp queda a `null` i no es trenquen claus existents.

### Notes de degradació controlada
- Si una regla `meeting_upcoming` no té `meeting_at`, s'omet i es registra un `warning`.
- Si la regla no pot resoldre cap municipi usable per construir el banner, també s'omet sense interrompre la resta del dashboard.
- Si no hi ha `last_processed_at`, el sistema encara calcula l'estat amb els llindars temporals i genera un missatge específic en català.

### Verificació
- Tests específics executats:
  - `pytest api/tests/test_dashboard.py`
- Sintaxi Python global executada:
  - `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`

## 2026-05-15 — Actualització de `GET /api/dashboard/temas` per ranking de momentum

### Canvis realitzats
- S'ha corregit i completat la implementació de `GET /api/dashboard/temas` perquè deixi d'usar la query antiga basada en volum acumulat i delegui en el servei real de `trending_score` ja existent.
- El ranking retornat ara es basa en `widget_trending_score`/`trending_score` en ordre descendent i filtra estrictament temes amb score positiu (`> 0`).
- S'ha mantingut el contracte mínim retrocompatible del payload (`tema`, `count`) i s'hi han afegit camps d'explicabilitat sota la clau opcional `score`.
- S'ha cobert el cas sense càlcul recent o sense dades disponibles retornant llista buida segura, i el cas amb últim càlcul disponible reutilitzant la marca temporal del payload del servei.
- S'ha reparat el wiring pendent entre ruta i servei que havia quedat incomplet en la iteració anterior.

### Arxius modificats
1. `api/src/routes/dashboard.py`
   - Afegits models Pydantic opcionals (`TendenciaItem`, `TendenciaScoreDetails`) per documentar la resposta sense trencar clients antics.
   - Simplificada la ruta `GET /api/dashboard/temas` perquè delegui a `dashboard_service.list_tendencias()`.
   - Manteniment de fallback segur a `[]` si una dependència de taula encara no existeix.
2. `api/src/services/dashboard_service.py`
   - Afegit `list_tendencias()` com a punt únic de construcció del payload del widget.
   - Ordenació per `trending_score` descendent amb tie-breakers de score base, premsa, delta i tema.
   - Filtre de `trending_score > 0`.
   - Construcció retrocompatible del payload amb:
     - `tema`
     - `count`
     - `trending_score`
     - `score.trending_score`
     - `score.base_score`
     - `score.delta_plens`
     - `score.score_premsa`
     - `score.score_xarxes`
     - `score.penalty_applied`
     - `score.calculated_at`
   - Resolució de `calculated_at` a partir del payload del servei (`windows.calculated_at` o darrera finestra disponible).
3. `api/tests/test_dashboard_tendencias.py`
   - Tests d'API per ordre, filtratge i shape mínim.
   - Test explícit del payload opcional d'explicabilitat.
   - Test de llista buida segura sense dades o sense càlcul recent.
   - Tests del servei de dashboard per garantir ordenació, filtre i ús de la marca temporal de l'últim càlcul disponible.
4. `specs/dashboard/SPEC.md`
   - Afegida aquesta secció de registre tècnic.

### Decisió de compatibilitat del payload
- Es manté la ruta existent `GET /api/dashboard/temas`.
- Es manté el shape mínim històric de cada element amb `tema` i `count`.
- Els camps nous s'exposen de manera compatible:
  - `trending_score` a nivell superior per facilitar UI nova.
  - detall sota `score`, com a clau opcional/anidada segura per a clients antics.

### Comportament sense càlcul recent
- Si el servei de `trending_score` no retorna files, la resposta és `[]`.
- Si hi ha un últim càlcul disponible però no una marca temporal explícita, el backend deriva `calculated_at` de la finestra més recent disponible (`windows.plens_recent.to` o `windows.premsa_recent.to`).
- Si una taula necessària encara no existeix i es produeix `UndefinedTable`, la ruta retorna `[]` en lloc de 500.

### Verificació
- Tests específics executats:
  - `pytest api/tests/test_dashboard_tendencias.py`
- Sintaxi Python global executada:
  - `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`

## 2026-05-16 — Adaptació del widget de "Temes en tendència" al nou payload de momentum

### Canvis realitzats
- S'ha desacoblat el consum de dades de tendències del `dashboard/page.tsx` cap a una capa petita d'API frontend (`web/src/lib/api/dashboard.ts`) per consumir directament `GET /api/dashboard/tendencias`.
- S'han creat tipus frontend específics per al widget amb compatibilitat parcial del payload: es mantenen camps antics (`tema`, `nombre`, `count`, `menciones`) i s'hi afegeixen camps opcionals de momentum (`trending_score`) i d'explicabilitat (`score`, `principal_signal`, `principal_source`, `penalty_applied`, `penalty_label`, `explanation_text`).
- El widget visual s'ha extret a `web/src/components/dashboard/TrendingTopicsWidget.tsx` per mantenir l'estil existent però eliminar la lògica antiga de render inline i qualsevol reordenació client-side per volum.
- La llista es mostra exactament en l'ordre rebut del backend, limitant-se només a tallar visualment a `top 8` sense recalcular ni resortar.
- S'han afegit textos visibles en català per als estats de càrrega, buit i error.
- Si arriben camps explicatius opcionals, el widget mostra una pista discreta en català amb score, senyal principal i penalització aplicada només quan hi ha dades disponibles.

### Arxius modificats
1. `web/src/app/dashboard/page.tsx`
   - Substituït el render inline de tendències per `TrendingTopicsWidget`.
   - La càrrega de temes passa a usar `fetchTrendingTopics()`.
   - Afegit estat d'error específic per al widget de tendències.
2. `web/src/components/dashboard/TrendingTopicsWidget.tsx`
   - Nou component específic del widget.
   - Render sense ordenació client-side.
   - Pistes opcionals d'explicabilitat en català.
3. `web/src/lib/api/dashboard.ts`
   - Nova funció `fetchTrendingTopics()`.
   - Mapatge null-safe del payload de `GET /api/dashboard/tendencias`.
   - Fallback a array buit si la resposta no és una llista.
4. `web/src/types/dashboard.ts`
   - Nous tipus `TrendingTopic` i `TrendingTopicExplanation` per reflectir el contracte nou amb compatibilitat parcial.
5. `specs/dashboard/SPEC.md`
   - Afegit aquest registre tècnic.

### Decisions tècniques
- **Ajust de pla per estructura real del repo**: el pla esmentava `frontend/src/...`, però el repositori real usa `web/src/...` i no disposava encara dels fitxers separats per `dashboard` al frontend. S'han creat en la ubicació equivalent dins `web/` mantenint l'abast funcional demanat.
- **Sense reordenació client-side**: no es fa cap `sort()` ni càlcul basat en volum acumulat. El widget només renderitza l'ordre retornat pel backend.
- **Compatibilitat parcial**: si encara arriben respostes incompletes o mixtes, el frontend continua mostrant el tema usant camps antics i només ensenya metadades addicionals quan existeixen.
- **Canvi visual mínim**: es manté `PanelBox` i `TrendingBar` existents per evitar una alteració dràstica del layout.

### Verificació
- Lint frontend global executat:
  - `npm --prefix web run lint`
  - Resultat observat: el comandament falla per errors preexistents en altres pantalles fora d'abast (`actas/[id]`, `buscar`, `chat/workspace`, `informes`, etc.), però no ha reportat errors nous específics del dashboard tocat abans d'aturar-se.
- Intent de lint focalitzat sobre els fitxers tocats:
  - `npx eslint web/src/app/dashboard/page.tsx web/src/components/dashboard/LastProcessedPlensWidget.tsx web/src/lib/api/dashboard.ts web/src/lib/dashboard/mappers.ts web/src/types/dashboard.ts`
  - Resultat observat: al runner es resol una versió global incompatible d'ESLint (`10.3.0`) que peta amb `eslint-plugin-react`, així que no s'ha pogut usar com a validació aïllada fiable.
- Build frontend executada:
  - `npm --prefix web run build`

## 2026-05-16 — Render del banner de reunions properes dins del widget d'Últims plens processats

### Canvis realitzats
- S'ha creat un component frontend específic per al widget d'"Últims plens processats" que encapsula el llistat existent i hi integra el banner de reunions properes sense alterar la composició general del dashboard.
- El frontend consumeix el camp backend `upcoming_meetings_banner` de `GET /api/dashboard/` i el normalitza amb fallback segur quan el bloc no existeix o arriba incomplet.
- S'han afegit tipus explícits per al banner i cada reunió (`status`, `title`, `municipality`, `meeting_at`, `last_processed_at`, `message`, `meetings`, `primary_meeting`, `thresholds`, `total`) seguint el shape actual retornat pel backend, sense recalcular severitats al client.
- El banner només es renderitza quan hi ha alertes vàlides i mostra dues variants visuals mínimes i clarament diferenciades:
  - `warning` en groc
  - `danger` en vermell
- Els textos visibles s'han mantingut en català i orientats a ús intern d'assessoria/partit.

### Arxius modificats
1. `web/src/components/dashboard/LastProcessedPlensWidget.tsx`
   - Nou component que reutilitza `PanelBox` i el llistat existent de plens.
   - Render condicional del banner només quan hi ha alertes disponibles.
   - Targetes compactes per reunió amb `títol`, `municipi`, `data` i `missatge resum`.
   - Comentari en codi documentant la decisió MVP per múltiples alertes.
2. `web/src/types/dashboard.ts`
   - Nous tipus `UpcomingMeetingAlertStatus`, `UpcomingMeetingAlertItem`, `UpcomingMeetingsBanner` i `DashboardOverview`.
3. `web/src/lib/dashboard/mappers.ts`
   - Nou normalitzador `normalizeDashboardOverview()` per propagar `upcoming_meetings_banner` amb compatibilitat cap enrere.
4. `web/src/lib/api/dashboard.ts`
   - Nova funció `fetchDashboardOverview()` que consumeix `GET /api/dashboard/` i aplica el mapper.
5. `web/src/app/dashboard/page.tsx`
   - Substitució del bloc inline d'"Últims plens processats" pel nou component, mantenint el layout general.
   - Càrrega addicional de l'overview del dashboard en paral·lel a la resta de dades.
6. `specs/dashboard/SPEC.md`
   - Afegit aquest registre tècnic.

### Decisions tècniques
- **Ajust del pla a l'estructura real del repo**: el pla esmentava rutes `frontend/src/...`, però el repositori real usa `web/src/...`. S'ha aplicat el canvi equivalent dins `web/`, mantenint exactament l'abast funcional demanat.
- **Sense lògica de negoci al frontend**: el component no calcula llindars ni decideix severitats; només pinta `warning` o `danger` segons `status` rebut del backend.
- **Múltiples alertes**: s'ha optat per mostrar una llista compacta de totes les alertes rebudes, preservant l'ordre servit per backend. Això és més conservador que reprioritzar al client i evita perdre context si hi ha més d'una reunió rellevant.
- **Absència de dades**: si el backend no retorna banner o les alertes arriben incompletes, no es reserva cap espai extra i el widget continua mostrant únicament el llistat de plens o l'estat buit existent.

### Verificació manual coberta al desenvolupament
- Mock lògic de cas `warning`: cobert pel render del badge groc i missatge de reunió propera.
- Mock lògic de cas `danger`: cobert pel render del badge vermell i missatge urgent.
- Mock lògic de múltiples alertes: cobert per la iteració sobre `meetings` mantenint l'ordre rebut.
- Mock lògic d'absència d'alertes: cobert pel render condicional sense reservar espai.

### Verificació
- Lint frontend executat:
  - `npm --prefix web run lint`
- Build frontend executada:
  - `npm --prefix web run build`

## 2026-05-14 — Task Celery beat diària per recalcular i persistir tendències

### Canvis realitzats
- S'ha afegit una task Celery explícita al pipeline per recalcular diàriament el `trending_score` del dashboard reutilitzant el servei comú existent de `api/src/services/trending_score_service.py`.
- La task persisteix de forma retrocompatible només sobre `temas_trend_signals` i només actualitza columnes de score compatibles si ja existeixen a l'esquema actual.
- No s'ha creat cap taula nova ni s'han tocat migracions SQL.
- S'ha afegit entrada de `beat_schedule` diària amb nom estable per a execució manual i programada.
- S'ha documentat l'execució manual i la verificació d'idempotència/logs al `README.md`.

### Arxius modificats
1. `api/src/services/trending_score_service.py`
   - Ampliat mínimament per afegir persistència retrocompatible via `UPDATE` sobre `temas_trend_signals`.
   - Descobriment dinàmic de columnes compatibles a `information_schema.columns`.
   - Nou helper `calculate_and_persist_from_existing_data()` per encapsular càlcul + persistència.
   - Sense canvis d'esquema: si no existeix cap columna compatible, el servei retorna resum amb `updated=0` i la task es recolza en logs.
2. `pipeline/src/workers/trending_tasks.py`
   - Nova task `src.workers.trending_tasks.recalculate_daily_trending_scores`.
   - Import diferit/preparat del servei del backend API.
   - Logs per tema amb `widget_trending_score`, `base_score`, `delta_plens`, `score_premsa` i `score_xarxes`.
   - Resum final amb `processed`, `attempted`, `updated` i errors de logging parcials.
3. `pipeline/src/workers/celery_app.py`
   - Registre del mòdul nou a `include`.
   - Nova entrada de beat diària a les `02:15`.
4. `README.md`
   - Runbook curt per llançar la task manualment i verificar persistència/idempotència.
5. `specs/dashboard/SPEC.md`
   - Afegit aquest registre tècnic.

### Decisions tècniques
- **Ajust de pla per estructura real del repo**: el pla esmentava `backend/...`, però el repositori real separa `api/` i `pipeline/`. La task s'ha implementat a `pipeline/src/workers/` i el servei reutilitzat viu a `api/src/services/`.
- **Idempotència**: la persistència fa exclusivament `UPDATE` per `tema` normalitzat sobre files ja existents a `temas_trend_signals`; per tant, un rerun no crea duplicats ni artefactes nous.
- **Retrocompatibilitat d'esquema**: abans d'escriure, el servei consulta `information_schema.columns` i només actualitza les columnes que existeixen realment entre aquest conjunt candidat:
  - `trend_score`
  - `trending_score`
  - `widget_trending_score`
  - `base_score`
  - `score_premsa`
  - `score_xarxes`
  - `delta_plens`
- **Fallada controlada**: si no hi ha cap columna compatible, la task no inventa persistència nova; acaba amb resum i warning a logs.
- **Atomicitat pràctica MVP**: el servei utilitza una sola connexió/context manager per a la ronda completa d'updates; si hi ha excepció real durant la persistència, la transacció es fa rollback per no deixar mitja escriptura confirmada.
- **Metadades d'auditoria**: com que no s'ha pogut assumir l'existència de camps auditables específics a `temas_trend_signals` sense tocar esquema, la traçabilitat mínima queda al resum retornat i als logs estructurats per execució.

### Execució manual documentada
- `python -m pipeline.src.workers.trending_tasks`
- `python -c "from pipeline.src.workers.trending_tasks import recalculate_daily_trending_scores; print(recalculate_daily_trending_scores())"`
- `docker compose exec pipeline-worker celery -A src.workers.celery_app call src.workers.trending_tasks.recalculate_daily_trending_scores`

### Integració real amb la infraestructura existent
- No ha calgut tocar `docker-compose.yml` perquè el wiring operatiu ja existia i ja arrenca aquests processos:
  - `pipeline-worker`: `celery -A src.workers.celery_app worker --loglevel=info --concurrency=4`
  - `pipeline-beat`: `celery -A src.workers.celery_app beat --loglevel=info`
- La integració efectiva s'ha resolt afegint el nou mòdul a `include` dins `pipeline/src/workers/celery_app.py` i registrant-hi la nova entrada de `beat_schedule`.
- El contenidor `pipeline` ja inclou `celery[redis]==5.4.*` a `pipeline/requirements.txt`, de manera que el runtime correcte per provar la task és el contenidor, no el Python host del runner.

### Verificació prevista / limitació observada
- Sintaxi Python global obligatòria: executada.
- Validació mínima d'infraestructura revisada al repo:
  - `docker-compose.yml` ja defineix `pipeline-worker` i `pipeline-beat` amb comandes Celery reals.
  - `pipeline/requirements.txt` ja inclou `celery[redis]`.
- Limitació del runner d'aquesta iteració:
  - la prova manual directa amb `python -c ...` al host falla amb `ModuleNotFoundError: No module named 'celery'` perquè el paquet no està instal·lat fora del contenidor.
  - per això s'han documentat els comandaments exactes de validació sobre Docker, que és el mode real d'execució d'aquest projecte.
