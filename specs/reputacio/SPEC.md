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

## 2026-05-09 — Validación funcional final y limpieza de noticias antiguas en `/reputacio`

### Cambios realizados
- Se añadió limpieza física de noticias antiguas al final de `ingest_rss_feeds()`.
- La limpieza elimina registros de `premsa_articles` con `data_publicacio` fuera de la ventana de 30 días, alineando almacenamiento y criterio visual de la pantalla.
- Se adaptó `POST /api/reputacio/ingest` para devolver tanto `nous_articles` como `articles_eliminats`, facilitando validación operativa del refresco y del pruning.
- Se registró evidencia funcional y técnica de cierre en `docs/qa-validacion-reputacio-intel-2026-05-09.md`.

### Archivos modificados
- `api/src/routes/reputacio.py`
- `docs/qa-validacion-reputacio-intel-2026-05-09.md`
- `specs/reputacio/SPEC.md`

### Decisiones técnicas
- Se aplicó la limpieza dentro de la propia ingesta para no introducir nuevos schedulers ni ampliar el alcance de la incidencia.
- Se preservó el criterio temporal ya usado por los endpoints (`30 días`) para que no exista discrepancia entre lo que se consulta y lo que se conserva.
- Se mantuvo el enfoque quirúrgico: sin migraciones nuevas y sin tocar la estructura de tabla existente.

### Evidencia
- `web/src/app/reputacio/page.tsx` ya hacía auto-refresh cada 30s con `cache: 'no-store'`.
- `api/src/routes/reputacio.py` ya devolvía respuestas no cacheables y ahora además ejecuta `DELETE FROM premsa_articles WHERE data_publicacio < cutoff`.
- `npm --prefix web run build` completó correctamente con rutas `/reputacio` y `/intel` generadas.
- La sintaxis Python global se verificó con éxito.

## 2026-05-09 — Ampliación de fuentes de prensa y catálogo de reputación

### Cambios realizados
- Se creó `api/src/services/reputacio_sources.py` con un catálogo estructurado y ampliado de fuentes de reputación.
- Se añadieron nuevas fuentes de prensa nacionales, regionales y locales al catálogo: `Diari de Girona`, `Regió7`, `Segre`, `Diari de Tarragona`, `Tot Barcelona`, `El Món`, `e-Notícies`, `ElCaso.cat`, además de las ya existentes.
- Se incorporaron metadatos por fuente: `tipus`, `ambit`, `territoris`, `prioritat`, `fiabilitat`, `es_local` y `categories`.
- Se definieron prioridades de cobertura local por territorio para reforzar municipios y comarcas con menor eco en prensa nacional.
- Se documentó un catálogo de fuentes sociales priorizadas y criterios explícitos para descartar ruido sin verificación.
- Se conectó la ingesta RSS existente para que use el catálogo centralizado mediante `get_rss_feeds()`.
- Se añadió el endpoint `GET /api/reputacio/sources` para exponer el catálogo ampliado al frontend.
- Se actualizó `web/src/app/reputacio/page.tsx` para mostrar el catálogo ampliado y la priorización de cobertura local dentro del panel de reputación.
- Se actualizó la descripción funcional de la página para reflejar que el módulo ya trabaja con prensa nacional, regional, local y fuentes sociales verificables.

### Archivos modificados
- `api/src/services/reputacio_sources.py`
- `api/src/routes/reputacio.py`
- `web/src/app/reputacio/page.tsx`
- `specs/reputacio/SPEC.md`

### Decisiones técnicas
- Se evitó introducir migraciones de base de datos porque el brief se podía cubrir ampliando el catálogo de entrada y la capa de exposición del módulo.
- Se centralizó el catálogo de fuentes en un servicio Python reutilizable para evitar volver a hardcodear listas RSS en la ruta.
- Las fuentes sociales se modelan como catálogo y criterio editorial, no como ingesta automática, para respetar el requisito de minimizar ruido y priorizar solo señales verificables.
- La priorización local se dejó por territorios/comarcas clave, que sirve como base operativa para futuras expansiones más finas por municipio.
- Se mantuvo el alcance quirúrgico: sin tocar pipeline, sin cambiar esquema SQL y sin refactorizar el resto de endpoints.

### Validación funcional esperada
- `GET /api/reputacio/sources` devuelve el catálogo completo de prensa, redes y prioridades locales.
- `POST /api/reputacio/ingest` ahora informa también de `fonts_actives` además del resultado de la ingesta.
- La página `/reputacio` muestra visualmente tanto el catálogo ampliado como la cobertura local prioritaria.
