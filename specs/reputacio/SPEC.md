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
