# SPEC — Intel

## 2026-05-07

### Cambios realizados
- Se añadió un estado de carga visible específico para `/intel` en navegación de ruta con `web/src/app/intel/loading.tsx`.
- Se mejoró el estado de carga dentro de `web/src/app/intel/page.tsx` para que, mientras esperan las 3 llamadas a la API, la pantalla no se perciba vacía.
- El loading ahora combina:
  - mensaje principal de carga,
  - bloque de progreso textual,
  - skeletons de KPIs y paneles principales.

### Archivos modificados
- `web/src/app/intel/page.tsx`
- `web/src/app/intel/loading.tsx`

### Decisiones técnicas
- Se eligió un patrón mixto de `skeleton + shimmer + mensaje de progreso` en lugar de un spinner aislado para reducir la sensación de vacío.
- Se reutilizó la estética existente de warroom (`PageHeader`, tokens visuales y clases de animación globales como `pulse-dot` y `skeleton`) para mantener coherencia visual.
- Se creó `loading.tsx` de ruta para cubrir el tiempo inicial de render/carga de la ruta en App Router.
- Se mantuvo además el `isLoading` interno en la página para cubrir los fetches cliente posteriores a filtros y recargas locales.
