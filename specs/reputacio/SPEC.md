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
