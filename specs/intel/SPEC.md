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

## 2026-05-07 — ajuste fino del loader

### Cambios realizados
- Se refinó el loader cliente de `/intel` para que no aparezca en cargas casi instantáneas mediante un retardo corto antes de mostrarlo.
- Se añadió una permanencia mínima una vez visible para evitar parpadeos cuando la respuesta llega justo después de mostrarse.
- Se mejoró la accesibilidad básica con anuncios `aria-live`, `role="status"` y `aria-busy` tanto en el loading de ruta como en el loading interno de datos.

### Archivos modificados
- `web/src/app/intel/page.tsx`
- `web/src/app/intel/loading.tsx`

### Decisiones técnicas
- Se aplicó un `delay` de aparición del loader para reducir ruido visual en respuestas rápidas sin perder feedback en esperas reales.
- Se mantuvo una ventana mínima de visibilidad para que el estado de carga sea perceptible y no desaparezca abruptamente.
- Se separó el control entre `isLoading` (estado real de fetch) y `showLoader` (estado visual), permitiendo ajustar UX sin alterar la lógica de datos.
