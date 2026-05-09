# SPEC — QA

## 2026-05-09 — Validación funcional final de `/reputacio` y `/intel`

### Cambios realizados
- Se revisó el estado actual de `/reputacio` y `/intel` para confirmar que los cambios de iteraciones previas siguen presentes.
- Se consolidó la evidencia funcional/técnica en `docs/qa-validacion-reputacio-intel-2026-05-09.md`.
- Se ejecutaron verificaciones reales de sintaxis Python y build/lint del frontend para dejar trazabilidad de cierre.

### Archivos revisados
- `web/src/app/reputacio/page.tsx`
- `web/src/app/intel/page.tsx`
- `api/src/routes/reputacio.py`
- `api/src/routes/intel.py`
- `docs/qa-validacion-reputacio-intel-2026-05-09.md`

### Decisiones técnicas
- La tarea se trató como validación final con actualización documental, no como nueva implementación, porque los cambios funcionales principales ya estaban presentes en el repositorio.
- Se creó una sección de especificación de QA para cumplir el requisito de registrar cambios realizados, archivos revisados y decisiones técnicas del cierre.
- No se tocaron archivos de producción adicionales al no detectar una regresión concreta en esta iteración.

### Evidencia ejecutada
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"` → sin salida, exit 0.
- `npm --prefix web run build` → build correcto con rutas `/reputacio` y `/intel` generadas.
- `npm --prefix web run lint` → falla por issues preexistentes en otras pantallas del proyecto; se documenta como gap transversal.

### Resultado de validación
- `/reputacio`: sigue haciendo polling cada 30s con `cache: 'no-store'` y la ingesta conserva pruning de noticias antiguas en backend.
- `/intel`: sigue mostrando loader diferido y con tiempo mínimo visible, con feedback accesible mientras la carga es perceptible.
