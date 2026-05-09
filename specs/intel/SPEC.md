# SPEC — Intel

## 2025-02-14 — Ajuste de tiempos y condiciones del loader en `/intel`

### Cambios realizados
- Se ajustó la lógica del loader de `/intel` para retrasar su aparición y evitar parpadeos en respuestas rápidas.
- Se garantizó un tiempo mínimo de visibilidad una vez mostrado, para que el estado de carga sea perceptible cuando la espera es real.
- Se eliminó la dependencia del efecto respecto a `showLoader` usando una referencia (`showLoaderRef`), evitando re-ejecuciones innecesarias del ciclo de carga.
- Se reforzó la accesibilidad del estado de carga añadiendo `aria-atomic="true"`, manteniendo `role="status"`, `aria-live="polite"` y `aria-busy`.
- Se añadió una línea descriptiva secundaria al loader para comunicar mejor qué datos se están recuperando.

### Archivos modificados
- `web/src/app/intel/page.tsx`
- `specs/intel/SPEC.md`

### Decisiones técnicas
- `LOADER_DELAY_MS = 350`: permite suprimir el loader en respuestas casi instantáneas sin dejar la pantalla vacía demasiado tiempo.
- `LOADER_MIN_VISIBLE_MS = 900`: asegura que, si el loader aparece, permanezca visible el tiempo suficiente para evitar un destello molesto.
- Se usó `showLoaderRef` para leer el estado actual del loader dentro de `finally()` sin introducir dependencias reactivas adicionales en el `useEffect`.
- La mejora de accesibilidad se mantuvo básica y no invasiva, alineada con el alcance del brief.

### Condiciones exactas implementadas
1. Al arrancar la carga de `/intel`, el loader no se pinta inmediatamente.
2. Solo aparece si la carga sigue activa tras `350ms`.
3. Si la respuesta llega antes de `350ms`, el loader no llega a mostrarse y se evita el parpadeo.
4. Si el loader sí llega a mostrarse, se conserva visible al menos `900ms` desde el momento en que aparece.
5. Al finalizar la carga, si ese mínimo ya se cumplió, el loader desaparece inmediatamente; si no, espera el tiempo restante.
6. El estado expone `role="status"`, `aria-live="polite"`, `aria-busy` y `aria-atomic="true"`.

### Validación / handoff
- Se eliminó el import no usado de `Link` en `web/src/app/intel/page.tsx`.
- Validación manual/handoff preparado: para comprobarlo en navegador, abrir `/intel`, simular red rápida y red lenta, y verificar que:
  - en red rápida no aparece el loader,
  - en red lenta aparece tras ~350ms,
  - una vez visible no desaparece antes de ~900ms,
  - el texto accesible del estado sigue presente mientras `aria-busy` está activo.
