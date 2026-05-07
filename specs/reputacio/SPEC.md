# SPEC — Reputació

## 2026-05-07 — Eliminación de noticias antiguas en /reputacio

### Objetivo
Evitar que en `/reputacio` se sigan mostrando noticias viejas fuera de la ventana esperada (30 días), incluso si llegan datos inconsistentes por formato/fecha o por desfase de zona horaria.

### Cambios realizados

#### 1) Filtro temporal defensivo en frontend
**Archivo:** `web/src/app/reputacio/page.tsx`

- Se añadió una función `withinWindow(dateText, days=30)` que:
  - parsea fechas con sufijo UTC (`T00:00:00Z`) para evitar desplazamientos por TZ local.
  - calcula cutoff en UTC por día.
  - excluye fechas inválidas o vacías.
- Se añadieron dos colecciones derivadas con `useMemo`:
  - `filteredArticles` (detalle de partido)
  - `filteredNegatius` (tab de limpieza)
- Se actualizó la UI para consumir esas listas filtradas:
  - contador de artículos recientes en detalle
  - renderizado de artículos por sentimiento
  - contador de negativos
  - listado de negativos
  - cálculo de `latestVisibleArticleDate`

#### 2) Validación temporal reutilizable en backend
**Archivo:** `api/src/routes/reputacio.py`

- Se añadieron helpers:
  - `_parse_iso_date(value)`
  - `_article_within_window(article_date, days)`
- Se incluyó import de `date` para soporte de parseo robusto.

> Nota: en esta iteración el filtro efectivo para renderizado se aplicó en frontend (punto crítico del bug visible). Los helpers backend se dejan listos para endurecer respuestas API en siguientes pasos sin duplicar lógica.

### Decisiones técnicas
- **Doble defensa:** Aunque el backend ya filtra por `data_publicacio >= since` en SQL, se aplica filtro adicional en cliente para:
  - proteger ante fechas mal parseadas o serializadas.
  - evitar regresiones visuales cuando entren datos históricos por rutas auxiliares.
- **UTC explícito en cliente:** reduce falsos negativos/positivos por zona horaria del navegador.

### Archivos modificados
- `web/src/app/reputacio/page.tsx`
- `api/src/routes/reputacio.py`
- `specs/reputacio/SPEC.md`

## 2026-05-07 — Corrección runtime en diagnóstico de /reputacio

### Objetivo
Corregir el error crítico de ejecución detectado en review al construir la respuesta de estadísticas/diagnóstico tras la iteración anterior.

### Cambios realizados
**Archivo:** `api/src/routes/reputacio.py`

- Se definió explícitamente `latest_visible_date` dentro de `reputacio_diagnostic` antes de componer la respuesta JSON.
- Se añadió `latest_visible_date` al bloque `db` del diagnóstico usando la fecha máxima de publicación solo si sigue dentro de la ventana solicitada.
- Con esto se elimina la referencia a variable inexistente que rompía el endpoint en runtime.

### Decisiones técnicas
- Se conserva la distinción entre:
  - `max_data_publicacio`: última fecha existente en base de datos.
  - `latest_visible_date`: última fecha que sigue siendo visible dentro de la ventana activa.
- Así el frontend puede diagnosticar correctamente si hay datos históricos almacenados pero ya no visibles.

### Archivos modificados
- `api/src/routes/reputacio.py`
- `specs/reputacio/SPEC.md`

## 2026-05-07 — Corrección de ventana temporal y purga de futuras en /reputacio

### Objetivo
Corregir el motivo por el que seguían apareciendo noticias como la de `2026-04-28`: además de filtrar antiguas, había que impedir que fechas futuras o mal normalizadas siguieran siendo visibles o persistieran en base de datos.

### Cambios realizados
**Archivo:** `web/src/app/reputacio/page.tsx`
- Se endureció `withinWindow(dateText, days=30)`:
  - normaliza la fecha a `YYYY-MM-DD` antes de parsearla.
  - rechaza formatos inválidos.
  - compara contra día UTC actual.
  - excluye explícitamente fechas futuras (`parsed <= todayUtc`).

**Archivo:** `api/src/routes/reputacio.py`
- Se endureció `_article_within_window(article_date, days)` para que solo acepte fechas dentro de la ventana y nunca posteriores a hoy.
- Se actualizó `cleanup_old_articles(days_to_keep=30)` para borrar tanto:
  - noticias antiguas fuera de ventana.
  - noticias con `data_publicacio` futura respecto a `now()` UTC.
- Con esto la limpieza al hacer ingest deja la tabla alineada con el comportamiento esperado de renderizado.

### Decisiones técnicas
- La corrección se aplica en **doble capa**:
  - **frontend** para evitar renderizar fechas fuera de rango por TZ o serialización.
  - **backend** para purgar registros inconsistentes y evitar que reaparezcan tras refrescos.
- Se conserva el criterio de ventana de 30 días ya usado por la UI y los endpoints.

### Archivos modificados
- `web/src/app/reputacio/page.tsx`
- `api/src/routes/reputacio.py`
- `specs/reputacio/SPEC.md`
