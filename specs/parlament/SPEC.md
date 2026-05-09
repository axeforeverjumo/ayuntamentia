# SPEC — Parlament

## 2025-02-14 — Configuración operativa inicial del módulo parlament

### Objetivo
Dejar documentada y preparada la configuración mínima para que el módulo `parlament` pueda operar en local/staging con el stack actual (API FastAPI + pipeline Celery + Postgres/Supabase).

### Cambios realizados
1. **Actualización de `.env.example`** con los parámetros operativos que el módulo necesitaba tener explícitos:
   - `PDF_STORAGE_PATH`
   - `API_INTERNAL_URL`
   - `ALERT_RULES_CRON_TOKEN`
   - `REPUTACIO_LLM_SENTIMENT`
   - `OPENCLAW_PROXY_URL`
   - `OPENCLAW_MODEL_FAST`
   - `PARLAMENT_ENABLED`
   - `PARLAMENT_BASE_URL`
   - `PARLAMENT_DSPC_INDEX_URL`
   - `PARLAMENT_USER_AGENT`
   - `PARLAMENT_BATCH_SIZE`
   - `PARLAMENT_DISCOVER_HOUR`
   - `PARLAMENT_ALLOWED_TYPES`

2. **Especificación de fuentes y dependencias reales** del módulo parlament a partir del código auditado:
   - Fuente principal de descubrimiento: índice DSPC de `parlament.cat`
   - Documento fuente procesado: PDFs del Diari de Sessions
   - Persistencia: tabla `sesiones_parlament`, reutilización de `puntos_pleno` con `nivel='parlament'`
   - Exposición API: `/api/parlament/sesiones`, `/api/parlament/puntos`, `/api/parlament/contradicciones`
   - Orquestación: tareas Celery `discover_parlament` y `process_parlament_batch`

3. **Validación de arranque funcional**:
   - Se comprobó que `api/src/main.py` ya registra `parlament.router` bajo `/api/parlament`.
   - Se comprobó que `pipeline/src/workers/celery_app.py` ya agenda `discover-parlament` y `process-parlament-batch`.
   - Se comprobó que `pipeline/src/workers/tasks.py` ya implementa ambas tareas.
   - Se verificó sintaxis Python global del repositorio.

### Configuración mínima requerida

#### Variables de entorno necesarias
| Variable | Valor inicial propuesto | Uso | Fuente |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:your-password@localhost:5432/postgres` | Acceso API/pipeline a Postgres | Supabase self-hosted |
| `REDIS_URL` | `redis://localhost:6379/0` | Broker/back-end Celery | Redis local/docker |
| `OPENCLAW_BASE_URL` | `http://localhost:4200/v1` o override compose `http://localhost:10531/v1` | LLM para estructuración | Proxy OpenClaw |
| `OPENCLAW_MODEL_MINI` | `gpt-5.4-mini` | Modelo para estructurar DSPC | Proxy OpenClaw |
| `PDF_STORAGE_PATH` | `/data/pdfs` | Ruta de almacenamiento de PDFs descargados | Volumen docker `pdf-storage` |
| `API_INTERNAL_URL` | `http://localhost:8050` | Trigger HTTP interno usado por otras tareas del pipeline | Servicio API |
| `PARLAMENT_ENABLED` | `1` | Flag documental de habilitación del módulo | Config repo |
| `PARLAMENT_BASE_URL` | `https://www.parlament.cat` | Host base de fuentes parlamentarias | Web oficial Parlament |
| `PARLAMENT_DSPC_INDEX_URL` | `https://www.parlament.cat/web/activitat-parlamentaria/dspc/index.html` | Índice de descubrimiento DSPC | Web oficial Parlament |
| `PARLAMENT_USER_AGENT` | `AyuntamentIA-Parlament/1.0` | User agent de scraping/descarga | Convención técnica |
| `PARLAMENT_BATCH_SIZE` | `2` | Tamaño inicial de lote de proceso | Ajuste operativo conservador |
| `PARLAMENT_DISCOVER_HOUR` | `2` | Hora de descubrimiento diaria | Ajuste operativo inicial |
| `PARLAMENT_ALLOWED_TYPES` | `pleno` | Tipos iniciales aceptados | Scope actual del código |

#### Tablas / esquema requeridos
Migración requerida ya existente:
- `supabase/migrations/004_parlament.sql`

Objetos creados por esa migración:
- `sesiones_parlament`
- columnas adicionales en `puntos_pleno`:
  - `nivel`
  - `sesion_parlament_id`
  - `partido_proponente`
- vista `v_contradicciones_rival`

### Decisiones técnicas
1. **No se ha refactorizado el código** para leer todavía las nuevas variables `PARLAMENT_*` porque la tarea pedía preparar la configuración necesaria y concretar parámetros/fuentes faltantes, no rehacer el módulo.
2. **Se documentan placeholders en `.env.example`** para dejar el arranque operativo reproducible sin introducir secretos reales.
3. **El alcance inicial queda limitado a DSPC/plenos** porque el código actual descubre PDFs DSPC y estructura puntos sobre `tipo='pleno'`; comisiones y vídeo existen en esquema pero no están implementados aún.
4. **La validación de arranque se considera satisfecha** porque:
   - la API expone el router,
   - la base de datos tiene migración dedicada,
   - el scheduler ya contiene tareas de descubrimiento/proceso,
   - el pipeline tiene implementación de download/extract/structure.

### Archivos modificados
- `.env.example`
- `specs/parlament/SPEC.md`

### Verificación ejecutada
#### Sintaxis Python global
Comando ejecutado:
```bash
python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"
```
Resultado esperado obtenido: exit 0 sin output.

#### Verificación de wiring del módulo
Comprobaciones manuales sobre código existente:
- `api/src/main.py` incluye `app.include_router(parlament.router, prefix="/api/parlament", tags=["parlament"])`
- `pipeline/src/workers/celery_app.py` agenda:
  - `discover-parlament`
  - `process-parlament-batch`
- `pipeline/src/workers/tasks.py` implementa:
  - `discover_parlament`
  - `process_parlament_batch`
- `supabase/migrations/004_parlament.sql` crea el esquema requerido.

### Pendiente / límites conocidos
- No se ejecutó un arranque real contra DB/Redis/OpenClaw porque requiere dependencias externas activas y datos/migraciones aplicadas en local.
- El parser actual sigue limitado a DSPC/PDF y `tipo='pleno'`; comisiones, vídeo y otros tipos siguen fuera del scope operativo actual.

## 2025-08-22 — Activación efectiva de configuración y verificación de operatividad

### Objetivo
Convertir la configuración de `parlament` en configuración realmente consumida por el código y añadir una comprobación observable para verificar si el módulo puede arrancar con los parámetros presentes.

### Cambios realizados
1. **Pipeline parametrizado con `PARLAMENT_*`**
   - `pipeline/src/config.py` ahora expone:
     - `PARLAMENT_ENABLED`
     - `PARLAMENT_BASE_URL`
     - `PARLAMENT_DSPC_INDEX_URL`
     - `PARLAMENT_USER_AGENT`
     - `PARLAMENT_BATCH_SIZE`
     - `PARLAMENT_DISCOVER_HOUR`
     - `PARLAMENT_ALLOWED_TYPES`
   - `pipeline/src/ingesta/parlament.py` ya usa `PARLAMENT_BASE_URL`, `PARLAMENT_DSPC_INDEX_URL` y `PARLAMENT_USER_AGENT` en el descubrimiento DSPC.
   - `pipeline/src/ingesta/parlament_pipeline.py` ya usa `PARLAMENT_USER_AGENT` en las descargas HTTP.

2. **Orquestación condicionada y ajustable**
   - `pipeline/src/workers/tasks.py` ahora respeta `PARLAMENT_ENABLED`:
     - `discover_parlament` devuelve `enabled=false` y no procesa si el módulo está desactivado.
     - `process_parlament_batch` devuelve `enabled=false` y no procesa si el módulo está desactivado.
   - `process_parlament_batch` usa `PARLAMENT_BATCH_SIZE` en lugar de un lote hardcodeado.
   - `pipeline/src/workers/celery_app.py` usa `PARLAMENT_DISCOVER_HOUR` para programar el descubrimiento diario.

3. **Verificación observable desde API**
   - `api/src/routes/parlament.py` añade `GET /api/parlament/config-status`.
   - Este endpoint informa:
     - si `PARLAMENT_ENABLED` está activo,
     - si faltan variables mínimas,
     - los valores efectivos de configuración relevantes,
     - si existen en la base de datos `sesiones_parlament`, `puntos_pleno` y `v_contradicciones_rival`.
   - Con ello el módulo ya tiene una comprobación explícita de operatividad/configuración sin depender de que existan sesiones procesadas.

### Archivos modificados
- `pipeline/src/config.py`
- `pipeline/src/ingesta/parlament.py`
- `pipeline/src/ingesta/parlament_pipeline.py`
- `pipeline/src/workers/tasks.py`
- `pipeline/src/workers/celery_app.py`
- `api/src/routes/parlament.py`
- `specs/parlament/SPEC.md`

### Decisiones técnicas
1. **Configuración mínima, sin refactor masivo**: se han activado solo los parámetros ya definidos en `.env.example` y conectados con el código existente.
2. **Validación de operatividad vía endpoint**: en lugar de forzar un job real contra servicios externos, se expone un chequeo de configuración+esquema más seguro y reproducible en local.
3. **Feature flag explícito**: `PARLAMENT_ENABLED` permite dejar desplegado el módulo sin ejecutar tareas cuando falte alguna dependencia externa.

### Verificación prevista
- Sintaxis Python global del repo.
- Import de `src.main:app` en API.
- Import de `src.workers.celery_app:app` y `src.workers.tasks` en pipeline.
- Revisión del endpoint `/api/parlament/config-status` como punto de comprobación operativa.
