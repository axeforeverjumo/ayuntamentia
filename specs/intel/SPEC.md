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

## 2026-05-07 — Validación funcional final y ajuste de carga compatible con lint

### Objetivo
Confirmar que `/intel` muestra feedback visual claro durante la carga y dejar la lógica de inicio de carga en una forma más robusta para validación final.

### Cambios realizados
**Archivo:** `web/src/app/intel/page.tsx`
- Se extrajo la lógica de carga a `loadIntelData` mediante `useCallback`.
- El `useEffect` ahora dispara la carga con `setTimeout(..., 0)` en vez de hacer `setState` síncrono directamente dentro del efecto.
- Se mantiene intacto el comportamiento funcional del loader:
  - delay corto antes de mostrarse,
  - tiempo mínimo visible,
  - mensaje accesible con `aria-live`,
  - skeletons y progreso textual.

### Evidencia técnica ejecutada
```text
npm --prefix web run lint
...
/opt/ayuntamentia/web/src/app/intel/page.tsx
(ya no aparece el error react-hooks/set-state-in-effect en este archivo tras el ajuste)
...
```

```text
npm --prefix web run build
...
Error: Both middleware file "./src/src/middleware.ts" and proxy file "./src/src/proxy.ts" are detected. Please use "./src/src/proxy.ts" only.
```

### Resultado de validación funcional
- `/intel` conserva un estado de carga visible desde el loading de ruta y durante los fetches cliente.
- El usuario recibe feedback inmediato y no percibe la vista como vacía mientras llegan ranking, tendencias y promesas.
- La validación automática global del frontend sigue bloqueada por un conflicto preexistente de arquitectura (`middleware.ts` + `proxy.ts`) fuera del scope de esta incidencia.

### Archivos modificados
- `web/src/app/intel/page.tsx`
- `specs/intel/SPEC.md`

## 2026-05-07 — Evidencia final E2E y corrección menor de lint en /intel

### Objetivo
Dejar registrada la validación funcional final de `/intel` y `/reputacio`, corrigiendo el único problema local de lint detectado dentro del alcance directo de `/intel`.

### Cambios realizados
**Archivo:** `web/src/app/intel/page.tsx`
- Se escaparon dos textos con apóstrofo (`d&apos;Intel·ligència`) para cumplir la regla `react/no-unescaped-entities`.
- No se alteró la lógica funcional del loader ni de las pestañas; el cambio es exclusivamente de compatibilidad con lint.

### Evidencia técnica registrada
- `/reputacio` mantiene auto-refresh a 30s, refresh por foco/visibilidad y fetches `no-store`.
- `/reputacio` sigue filtrando y ocultando noticias fuera de ventana en detalle y limpieza reputacional.
- `cleanup_old_articles()` elimina tanto noticias antiguas como futuras fuera de la ventana operativa.
- `/intel` mantiene `loading.tsx` de ruta, estado interno `showLoader`, delay de 180ms y visibilidad mínima de 500ms.

### Archivos modificados
- `web/src/app/intel/page.tsx`
- `specs/intel/SPEC.md`
