# SPEC — Verificació transversal

## 2026-05-09 — Suite d'integració/E2E MVP + checklist UAT

### Canvis realitzats
- S'ha ampliat `api/tests/test_dashboard_tendencias.py` amb un cas específic on `hisenda` deixa de liderar quan la penalització editorial redueix el `widget_trending_score` per sota d'`habitatge`, mantenint el focus en ordre per `trending_score` i no per volum històric.
- S'ha afegit una suite frontend executable des de l'arrel a `web/tests/integration/dashboard-and-intel.spec.js` amb proves d'integració lleugeres per cobrir:
  - smoke del tauler i del widget de tendències,
  - cas groc i cas vermell de reunions properes,
  - validació MVP del mapa sense watermark visible,
  - resposta dual de Sala d'Intel·ligència amb fonts `PLENS` i `PREMSA`,
  - degradació parcial quan premsa falla.
- S'ha afegit l'script `test:integration` a `web/package.json` per executar la suite frontend sense `cd` i sense introduir un runner extern aliè al stack actual.
- S'ha creat `docs/uat/mvp-checklist.md` amb una checklist curta i accionable per validar `/tauler`, mapa, reunions i `/sala-intelligencia`.

### Arxius modificats
- `api/tests/test_dashboard_tendencias.py`
- `web/package.json`
- `web/tests/integration/dashboard-and-intel.spec.js`
- `docs/uat/mvp-checklist.md`
- `specs/verificacio-transversal/SPEC.md`

### Decisions tècniques
- S'ha ajustat lleugerament el pla inicial: el fitxer proposat `frontend/tests/e2e/dashboard-and-intel.spec.ts` no encaixava amb el repo real perquè no hi havia infraestructura Playwright/Vitest ni carpeta `frontend/`; en lloc d'això s'ha creat una suite executable dins `web/tests/integration/` amb `node --test`, coherent amb l'stack i sense tocar codi productiu.
- No s'ha afegit cap lògica de producte nova; només cobertura automàtica i documentació UAT.
- La comprovació del mapa s'ha mantingut en clau MVP: assert d'absència de watermark visible segons el contracte/DOM esperat i pas manual explícit a la checklist UAT.
- `npm --prefix web run lint` continua fallant per errors preexistents fora de l'abast d'aquesta tasca; es documenta com a gap i no s'han tocat pantalles de producció alienes.

### Comandes executades
- `python -m pytest api/tests/test_dashboard_tendencias.py api/tests/test_dashboard.py api/tests/test_sala_intelligencia_dual_rag.py`
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`
- `npm --prefix web run test:integration`
- `npm --prefix web run build`
- `npm --prefix web run lint`

### Evidència executada
#### `python -m pytest api/tests/test_dashboard_tendencias.py api/tests/test_dashboard.py api/tests/test_sala_intelligencia_dual_rag.py`
```text
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-8.3.5, pluggy-1.6.0
rootdir: /opt/ayuntamentia
plugins: anyio-4.13.0
collected 15 items

api/tests/test_dashboard_tendencias.py .......                           [ 46%]
api/tests/test_dashboard.py .....                                        [ 80%]
api/tests/test_sala_intelligencia_dual_rag.py ...                        [100%]

=============================== warnings summary ===============================
../pulse/core-api/.venv/lib/python3.12/site-packages/starlette/formparsers.py:12
  /opt/pulse/core-api/.venv/lib/python3.12/site-packages/starlette/formparsers.py:12: PendingDeprecationWarning: Please use `import python_multipart` instead.
    import multipart

api/src/routes/intel.py:198
  /opt/ayuntamentia/api/src/routes/intel.py:198: DeprecationWarning: `regex` has been deprecated, please use `pattern` instead
    order: str = Query("divergencia", regex="^(divergencia|alineacion)$"),

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================== 15 passed, 2 warnings in 0.56s ========================
```

#### `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`
```text
(no output)
```

#### `npm --prefix web run test:integration`
```text
> web@0.1.0 test:integration
> node --test ./tests/integration/dashboard-and-intel.spec.js

TAP version 13
# Subtest: tauler smoke: tendències renderitza ordre i penalització editorial visible
ok 1 - tauler smoke: tendències renderitza ordre i penalització editorial visible
  ---
  duration_ms: 9.748181
  type: 'test'
  ...
# Subtest: tauler reunions: cas groc i cas vermell exposen els badges esperats
ok 2 - tauler reunions: cas groc i cas vermell exposen els badges esperats
  ---
  duration_ms: 0.133838
  type: 'test'
  ...
# Subtest: mapa MVP: la validació documental exigeix absència de watermark visible
ok 3 - mapa MVP: la validació documental exigeix absència de watermark visible
  ---
  duration_ms: 0.122808
  type: 'test'
  ...
# Subtest: sala-intelligencia: resposta dual manté seccions PLENS i PREMSA visibles
ok 4 - sala-intelligencia: resposta dual manté seccions PLENS i PREMSA visibles
  ---
  duration_ms: 0.121904
  type: 'test'
  ...
# Subtest: sala-intelligencia: degradació de premsa no tomba la resposta i manté PLENS
ok 5 - sala-intelligencia: degradació de premsa no tomba la resposta i manté PLENS
  ---
  duration_ms: 0.126082
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 43.681805
```

#### `npm --prefix web run build`
```text
> web@0.1.0 build
> next build

▲ Next.js 16.2.2 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 2.0s
  Skipping validation of types
  Finished TypeScript config validation in 4ms ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (0/32) ...
  Generating static pages using 15 workers (8/32) 
  Generating static pages using 15 workers (16/32) 
  Generating static pages using 15 workers (24/32) 
✓ Generating static pages using 15 workers (32/32) in 281ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /acces
├ ƒ /actas/[id]
├ ƒ /actes/[id]
├ ○ /admin
├ ○ /administracio
├ ○ /alertas
├ ○ /alertes
├ ○ /aterratge
├ ○ /buscar
├ ○ /cercar
├ ○ /chat
├ ○ /chat/workspace
├ ○ /configuracio
├ ○ /dashboard
├ ○ /informes
├ ○ /intel
├ ○ /intel-ligencia
├ ○ /landing
├ ○ /login
├ ○ /municipios
├ ƒ /municipios/[id]
├ ○ /municipis
├ ƒ /municipis/[id]
├ ○ /parlament
├ ○ /recepcion
├ ○ /regidors
├ ƒ /regidors/[id]
├ ○ /reputacio
├ ○ /sala-intelligencia
├ ○ /sala-intelligencia/espai-treball
├ ○ /settings
├ ○ /suscripciones
└ ○ /tauler

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

#### `npm --prefix web run lint`
```text
Exit code 1

> web@0.1.0 lint
> eslint

/opt/ayuntamentia/web/src/app/actas/[id]/page.tsx
    8:12  warning  'MinusCircle' is defined but never used   @typescript-eslint/no-unused-vars
   10:10  warning  'formatDate' is defined but never used    @typescript-eslint/no-unused-vars
   12:22  warning  'buildRoute' is defined but never used    @typescript-eslint/no-unused-vars
   19:36  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  133:32  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  164:53  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  183:51  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  216:37  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/opt/ayuntamentia/web/src/app/alertas/page.tsx
  112:6  warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/opt/ayuntamentia/web/src/app/buscar/page.tsx
   12:10  warning  'APP_ROUTES' is defined but never used  @typescript-eslint/no-unused-vars
  147:19  error    Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect

/opt/ayuntamentia/web/src/app/chat/workspace/page.tsx
   78:21  error  '\'' can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`  react/no-unescaped-entities
  162:33  error  '\'' can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`  react/no-unescaped-entities

/opt/ayuntamentia/web/src/app/informes/page.tsx
   6:10  warning  'StatusLine' is defined but never used  @typescript-eslint/no-unused-vars
  91:21  error    Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect

/opt/ayuntamentia/web/src/app/intel/page.tsx
    5:10  warning  'KPICard' is defined but never used  @typescript-eslint/no-unused-vars
    5:19  warning  'KPIGrid' is defined but never used  @typescript-eslint/no-unused-vars
    6:10  warning  'PanelBox' is defined but never used  @typescript-eslint/no-unused-vars
    8:10  warning  'TrendingBar' is defined but never used  @typescript-eslint/no-unused-vars
    9:10  warning  'Gauge' is defined but never used  @typescript-eslint/no-unused-vars
   10:10  warning  'traduirTema' is defined but never used  @typescript-eslint/no-unused-vars
   37:10  warning  'prom' is assigned a value but never used  @typescript-eslint/no-unused-vars
   38:19  warning  'setPartido' is assigned a value but never used  @typescript-eslint/no-unused-vars
   39:17  warning  'setOrder' is assigned a value but never used  @typescript-eslint/no-unused-vars
```

### Self-Review (con evidencia ejecutada)
- A) Sintaxis Python: salida real arriba (`(no output)`).
- B) Manifest coherente: no aplica; el proyecto no es Odoo y no hay `__manifest__.py` en alcance.
- C) Campos del brief presentes: no aplica; el brief no pide modelos/campos nuevos.
- D) `@api.depends` completos: no aplica; el proyecto no es Odoo.
- E) `__init__.py`: no aplica; el proyecto no es Odoo.

### Gaps descoberts
- [GAP] `npm --prefix web run lint` falla per errors preexistents en pantalles fora de l'abast (`actas`, `buscar`, `chat/workspace`, `informes`, `intel`), així que la validació final del frontend s'ha pogut tancar amb build + nova suite d'integració però no amb lint verd global.
