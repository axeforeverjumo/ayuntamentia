# SPEC — Reputació

## 2026-04-28 — Diagnóstico de falta de actualización automática en `/reputacio`

### Cambios realizados
- No se modificó código de aplicación.
- Se auditó el flujo completo de `/reputacio` en cliente, API y scheduler.
- Se creó esta especificación con la evidencia reproducible del diagnóstico.

### Archivos revisados
- `web/src/app/reputacio/page.tsx`
- `web/src/app/intel/page.tsx`
- `api/src/routes/reputacio.py`
- `api/src/routes/intel.py`
- `api/src/main.py`
- `pipeline/src/workers/celery_app.py`
- `pipeline/src/workers/tasks.py`
- `docker-compose.yml`

### Hallazgos técnicos
1. **El cliente sí intenta refrescar automáticamente**
   - `/reputacio` hace `fetch` de stats, detalle y diagnóstico.
   - Además monta un `window.setInterval(..., 30000)` para refrescar cada 30 segundos.
   - También existe un botón manual `Sync ara` que llama a `POST /api/reputacio/ingest`.

2. **El servidor sí expone endpoints de ingesta y diagnóstico**
   - `POST /api/reputacio/ingest`
   - `GET /api/reputacio/sentiment-partit`
   - `GET /api/reputacio/stats`
   - `GET /api/reputacio/temes-negatius`
   - `GET /api/reputacio/diagnostic`

3. **El scheduler de backend también está configurado**
   - `pipeline/src/workers/celery_app.py` registra `ingest-premsa` cada 30 minutos.
   - `pipeline/src/workers/tasks.py` implementa `ingest_premsa()` llamando al API por HTTP.

4. **La fecha visible queda fijada en `2026-04-28` por falta de noticias nuevas en origen/BD, no por ausencia de refresco del cliente**
   - La base devuelve `max(data_publicacio) = 2026-04-28`.
   - Para AC, los últimos artículos visibles también terminan en `2026-04-28`.
   - La UI calcula la fecha visible a partir de los artículos recibidos del backend, así que reproduce fielmente el estado de la BD.

5. **Hay feeds rotos o caducados que limitan la cobertura**
   - `https://www.elpuntavui.cat/rss.html` responde `403 Forbidden`.
   - `https://www.acn.cat/rss` responde `404 Not Found`.
   - `https://www.catalunyapress.cat/rss` responde `404 Not Found`.
   - El resto de feeds probados sí responden `200`.

6. **La limpieza de noticias antiguas existe, pero no explica el bloqueo en `2026-04-28`**
   - `cleanup_old_articles(30)` se ejecuta al inicio de cada ingesta.
   - En la BD solo había `2` artículos fuera de la ventana de 30 días durante la verificación.
   - Por tanto, la causa principal no es que fallen los borrados, sino que no entra contenido más nuevo.

### Evidencia reproducible resumida
- Respuesta HTTP local de `GET /api/reputacio/sentiment-partit?partit=AC&dies=30`:
  - últimos artículos para AC con fechas `2026-04-28`, `2026-04-27` y `2026-04-17`.
- Consulta SQL local:
  - `select max(data_publicacio)::date, min(data_publicacio)::date, count(*) from premsa_articles`
  - resultado: `(2026-04-28, 2017-04-10, 410)`.
- Consulta SQL local por AC:
  - últimas filas con `data_publicacio` máxima `2026-04-28`.
- Comprobación de feeds:
  - varias fuentes están devolviendo `403/404`, reduciendo entradas disponibles.

### Causa raíz probable
La causa más probable es **una combinación de falta de contenido nuevo en la tabla `premsa_articles` y degradación parcial de las fuentes RSS**, no un problema del refresco automático en frontend. El cliente refresca cada 30s, el API expone ingesta manual y el scheduler está programado cada 30 min. Si la BD sigue anclada en `2026-04-28`, la UI seguirá mostrando esa fecha.

### Riesgos / decisiones técnicas
- No se tocó código porque el encargo pedía reproducir y diagnosticar con evidencia.
- Corregir el problema real requerirá revisar operación/despliegue del beat/worker y actualizar los feeds rotos antes de introducir cambios funcionales.

### Gaps detectados para futuras tareas
- [GAP] Verificar en ejecución real que `pipeline-beat` esté levantado y lanzando `ingest-premsa` en producción.
- [GAP] Sustituir o reparar los feeds RSS que hoy responden 403/404 (`El Punt Avui`, `ACN`, `Catalunya Press`).
- [GAP] El endpoint `/api/reputacio/diagnostic` devuelve 404 en el servicio HTTP activo pese a existir en el código actual; revisar si la instancia levantada no coincide con el checkout local o si requiere redeploy.
- [GAP] Revisar por qué los artículos en BD tienen fechas futuras (`2026`) y confirmar si el origen RSS está publicando timestamps adelantados o si existe un problema de normalización de fechas.

## 2026-04-28 — Ajuste incremental tras el diagnóstico

### Cambios realizados
- Se mantuvo el diagnóstico previo de `/reputacio` como base de la tarea.
- Se corrigió el refresco automático del cliente para evitar solapes de `refreshAll()` cuando coinciden el `setInterval`, la carga inicial y el sync manual.
- Se confirmó que `/intel` ya muestra un estado de carga explícito mientras llegan los datos.

### Archivos modificados
- `web/src/app/reputacio/page.tsx`
- `specs/reputacio/SPEC.md`

### Decisiones técnicas
1. **Guardia de refresco en cliente**
   - Se añadió `useRef` con `refreshInFlightRef` en `web/src/app/reputacio/page.tsx`.
   - `refreshAll()` ahora aborta si ya hay una actualización en vuelo.
   - Esto reduce condiciones de carrera entre:
     - carga inicial,
     - polling cada 30s,
     - botón manual `Sync ara`.

2. **Diagnóstico sigue apuntando a backend/datos, no a ausencia de polling**
   - El cliente ya tenía polling y visualización de la última fecha visible.
   - El cambio no altera la causa raíz probable documentada: si la BD sigue anclada en `2026-04-28`, la UI seguirá mostrando esa fecha.

3. **`/intel` ya cumple la parte visual del checklist**
   - Se verificó que `web/src/app/intel/page.tsx` renderiza `Carregant intel·ligència…` cuando `isLoading` es `true`.

### Verificaciones ejecutadas
- Parseo global de Python con `ast`: OK.
- Verificación de manifests Odoo: sin módulos Odoo presentes, sin incidencias.
- Verificación de imports `__init__.py` Odoo: sin módulos Odoo presentes, sin incidencias.
