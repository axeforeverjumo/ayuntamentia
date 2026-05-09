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

## 2026-05-09 — Auditoría de cobertura completa de municipios

### Cambios realizados
- Se reabrió la auditoría documental de municipios para corregir la conclusión previa de que el catálogo no era detectable en el repositorio.
- Se localizó y documentó la fuente real del catálogo en esquema, API y pipeline.
- Se dejó definido el criterio formal de completitud del catálogo y el procedimiento exacto de comparación contra la referencia oficial integrada.
- Se actualizó la documentación de auditoría en `docs/municipis-auditoria-cobertura-2026-05-09.md`.

### Archivos revisados
- `supabase/migrations/001_schema.sql`
- `api/src/routes/municipios.py`
- `pipeline/src/ingesta/socrata_client.py`
- `pipeline/src/config.py`
- `scripts/seed_data.py`
- `.env.example`
- `docs/municipis-auditoria-cobertura-2026-05-09.md`

### Archivos modificados
- `docs/municipis-auditoria-cobertura-2026-05-09.md`
- `specs/qa/SPEC.md`

### Decisiones técnicas
- La tarea se trató como **exploración/auditoría**, por lo que no se tocaron archivos de producción ni se alteró la carga de datos.
- La referencia operativa primaria se fijó en la misma fuente ya integrada por el pipeline (`SOCRATA_ENTES_DATASET=6nei-4b44` con filtro `nomtipus='Municipis'`) para evitar auditorías contra una fuente distinta a la de producción.
- Se recomienda usar IDESCAT/Nomenclàtor oficial como segunda validación institucional de vigencia y denominación.
- No se cerró la checklist de comparación nominal porque el repositorio no contiene un snapshot del contenido actual de la tabla `municipios`; solo contiene esquema y mecanismo de sincronización.

### Evidencia ejecutada
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"` → sin salida, exit 0.
- `find . -name __manifest__.py -not -path './.git/*' | wc -l` → `0`.
- `find addons -maxdepth 2 -type d 2>/dev/null | wc -l` → `0`.
- Búsqueda ampliada en Python con `python3` sobre palabras clave (`municipios`, `codi_ens`, `SOCRATA_ENTES_DATASET`, `Municat`, `sync_municipios`) → localizó esquema/API/pipeline reales.

### Resultado de auditoría
- El módulo de municipios sí existe y se apoya en la tabla `municipios`.
- El catálogo se sincroniza desde Transparència Catalunya / Socrata (dataset `6nei-4b44`) mediante `sync_municipios()`.
- La clave de completitud correcta es `codi_ens`.
- Queda documentado el criterio de completitud y el procedimiento para obtener faltantes/sobrantes/inconsistencias cuando se disponga del contenido real de la base de datos.
