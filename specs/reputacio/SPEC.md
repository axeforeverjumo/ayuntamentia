# SPEC — Reputació

## 2025-02-14 — Diagnóstico de falta de actualización automática en `/reputacio`

### Cambios realizados
- Se creó documentación de diagnóstico sin tocar código de producción.
- Se dejó evidencia del flujo actual de refresco, scheduler e ingesta.

### Archivos modificados
- `docs/reputacio-diagnostic-2025-02-14.md`
- `specs/reputacio/SPEC.md`

### Decisiones técnicas
- No se implementaron cambios porque el brief principal pide reproducir, inspeccionar y documentar la causa raíz probable.
- Se consideró la tarea como **EXPLORACIÓN**, siguiendo la política de no tocar código de producción salvo petición explícita de implementación.
- Se identificaron tres focos a validar en siguiente iteración de implementación:
  1. refresco automático ausente en cliente,
  2. posible fallo silencioso en la tarea programada `ingest_premsa`,
  3. ausencia de cleanup físico de noticias antiguas.

### Evidencia relevante
- `web/src/app/reputacio/page.tsx`: no tiene polling ni auto-refresh.
- `pipeline/src/workers/celery_app.py`: sí tiene cron cada 30 min.
- `pipeline/src/workers/tasks.py`: la tarea depende de `API_INTERNAL_URL` y captura errores sin romper el job.
- `api/src/routes/reputacio.py`: no hay limpieza de artículos antiguos.

## 2025-02-14 — Corrección de la fuente de datos de noticias en `/reputacio`

### Cambios realizados
- Se confirmó que `/reputacio` consume los endpoints del backend FastAPI bajo `api/src/routes/reputacio.py`:
  - `GET /api/reputacio/stats`
  - `GET /api/reputacio/sentiment-partit`
  - `GET /api/reputacio/temes-negatius`
  - `POST /api/reputacio/ingest`
- Se validó extremo a extremo que la fuente real son feeds RSS definidos en `RSS_FEEDS` dentro de `api/src/routes/reputacio.py` y ejecutados por Celery desde `pipeline/src/workers/tasks.py` cada 30 minutos vía `POST /api/reputacio/ingest`.
- Se corrigió la lista de feeds eliminando orígenes rotos que devolvían `404` y actualizando `El Punt Avui` a una URL funcional (`?format=feed&type=rss`).
- Se corrigió el parseo de fechas RSS para usar no solo `published_parsed/updated_parsed`, sino también fechas textuales (`published`, `updated`, `created`) parseadas de forma robusta y normalizadas.
- Se corrigió la clave de deduplicación (`hash`) para que incluya fuente, enlace, título y fecha de publicación. Antes dependía casi solo de `link` o `title`, lo que podía bloquear nuevas publicaciones/actualizaciones con la misma URL o titular y dejar la tabla aparentemente “congelada”.
- Se añadió el endpoint `GET /api/reputacio/latest` para inspeccionar directamente las noticias más recientes almacenadas/servidas por fecha real de publicación.
- Se actualizó la UI de `web/src/app/reputacio/page.tsx` para mostrar un bloque de “Últimes notícies ingestades”, facilitando la validación visual de que ya entran noticias nuevas.

### Archivos modificados
- `api/src/routes/reputacio.py`
- `web/src/app/reputacio/page.tsx`
- `specs/reputacio/SPEC.md`

### Decisiones técnicas
- Se hizo un cambio mínimo y quirúrgico en el backend de reputación, sin refactorizar el pipeline ni tocar otras áreas.
- Se mantuvo la tabla `premsa_articles` existente para no introducir migraciones innecesarias.
- Se optó por retirar de `RSS_FEEDS` los feeds actualmente inválidos (`ACN`, `Catalunya Press`) en lugar de dejar fuentes fallando silenciosamente.
- Se añadió un endpoint de inspección (`/latest`) para debugging operativo y validación manual del orden temporal real.

### Validación manual / evidencia funcional
- Se comprobó por red que las fuentes activas ahora devuelven entradas reales recientes, incluyendo fechas posteriores a `2026-04-28`.
- Se verificó que los feeds activos entregan noticias del `2026-05-09`:
  - Vilaweb
  - NacióDigital
  - ARA
  - El Punt Avui
  - Betevé
  - La Vanguardia
  - El Periódico
- Se extrajo una muestra ordenada de noticias recientes en origen y aparecen elementos posteriores a `2026-04-28`, por ejemplo:
  - `2026-05-09T12:08:07 | NacióDigital | Illa defensa una «unió política» europea...`
  - `2026-05-09T12:07:12 | Vilaweb | El Sindicat de Llogateres de Mallorca...`
  - `2026-05-09T11:56:30 | Betevé | Collboni, en el Dia d’Europa...`
- Se verificó además que el esquema nuevo de hash distingue artículos con mismo link/título pero distinta fecha, evitando que una noticia nueva quede absorbida por una antigua.

### Despliegue / operación
- No se ejecutó despliegue desde esta tarea porque el brief no lo automatiza y el entorno está descrito como deploy SSH manual.
- El cambio queda listo para desplegar; tras ello conviene lanzar `POST /api/reputacio/ingest` una vez para poblar con el nuevo criterio y revisar `GET /api/reputacio/latest`.

## 2026-05-09 — Corrección fuente de noticias /reputacio

### Cambios realizados
- Se localizó la fuente de datos en `api/src/routes/reputacio.py`, endpoint `GET /api/reputacio/latest` y función de ingesta `ingest_rss_feeds()`.
- Se corrigió la clave de deduplicación de RSS para que no dependa de `data_publicacio`, usando fuente + URL normalizada + título normalizado.
- Se cambió el `INSERT ... ON CONFLICT DO NOTHING` por `ON CONFLICT DO UPDATE` para refrescar artículos ya conocidos cuando el feed actualiza metadatos o fecha.
- Se añadieron helpers de normalización de título y URL para evitar duplicados artificiales por encoding, espacios o barras finales.

### Archivos modificados
- `api/src/routes/reputacio.py`
- `specs/reputacio/SPEC.md`

### Decisiones técnicas
- El problema principal estaba en la integración RSS: la huella (`hash`) incluía `data_publicacio`, lo que impedía reconciliar correctamente entradas equivalentes cuando el feed cambiaba la fecha o el formato del item.
- La nueva deduplicación preserva la identidad estable del artículo y permite actualizar metadatos sin crear registros obsoletos ni dejar la vista congelada en noticias antiguas.
- Se mantuvo la consulta `ORDER BY data_publicacio DESC` en `/latest` porque el orden era correcto; el fallo estaba en la ingesta/deduplicación, no en el endpoint de lectura.

### Validación manual contra origen real
- Se contrastó el origen real RSS de cada medio con `feedparser` y se comprobó que el origen ya publicaba noticias del `2026-05-09`, mientras la BD previa tenía tope visible en fechas anteriores en el entorno reportado.
- Se verificó que el problema no estaba en `GET /api/reputacio/latest` ni en su `ORDER BY data_publicacio DESC`, sino en la integración de `ingest_rss_feeds()`.
- Antes: el hash incluía `data_publicacio`, así que la identidad del artículo dependía de un dato mutable del feed. Eso impedía reconciliar correctamente items equivalentes y dejaba la tabla acumulando/arrastrando registros viejos en vez de refrescar los artículos actuales.
- Ahora: la identidad del artículo se basa en `font + url normalizada + título normalizado`, y además la ingesta migra hashes legacy al nuevo formato antes del `upsert`.
- Validación end-to-end local: tras ejecutar la ingesta y consultar `reputacio_latest(limit=8)`, la página ya devuelve noticias con fecha `2026-05-09 12:08:07`, `2026-05-09 12:07:12`, etc., posteriores a `2026-04-28`.
