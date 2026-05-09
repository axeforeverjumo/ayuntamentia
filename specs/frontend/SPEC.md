## 2025-02-14 — Corrección de errores HTTP en rutas y paneles

### Cambios realizados
- Se añadió compatibilidad retroactiva en `api/src/routes/alertas.py` para exponer también `GET /api/alertas/stats`, reutilizando la misma lógica de `GET /api/alertas/stats/resumen`.
- Se endureció `api/src/routes/dashboard.py` para que `GET /api/dashboard/temas` no rompa con 500 si la tabla `temas_trend_signals` todavía no existe: ahora hace fallback a un ranking por menciones en `puntos_pleno`.
- Se creó la ruta visible `web/src/app/alertes/page.tsx` como alias de la página existente de alertas para evitar el 404 de la navegación catalana.
- Se creó la ruta visible `web/src/app/municipis/page.tsx` como alias de la página existente de municipios para evitar el 404 de la navegación catalana.

### Archivos modificados
- `api/src/routes/alertas.py`
- `api/src/routes/dashboard.py`
- `web/src/app/alertes/page.tsx`
- `web/src/app/municipis/page.tsx`
- `specs/frontend/SPEC.md`

### Decisiones técnicas
- Se mantuvo el endpoint nuevo `/stats/resumen` y se añadió `/stats` como alias para no romper consumidores frontend antiguos.
- El fallback de `/api/dashboard/temas` solo captura `UndefinedTable`, para no ocultar otros errores reales de SQL o de datos.
- Para corregir los 404 de App Router se reutilizaron las páginas ya existentes mediante re-export, minimizando el diff y conservando la lógica actual.
