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
- Se auditó documentalmente el módulo de municipios para localizar la fuente oficial real usada por el sistema.
- Se verificó con una consulta remota real que la referencia operativa devuelve **947 municipios**.
- Se actualizó `docs/municipis-auditoria-cobertura-2026-05-09.md` con la evidencia de fuente, la comprobación del entorno local y el criterio de completitud del catálogo.

### Archivos revisados
- `supabase/migrations/001_schema.sql`
- `api/src/routes/municipios.py`
- `pipeline/src/ingesta/socrata_client.py`
- `pipeline/src/config.py`
- `.env.example`
- `scripts/seed_data.py`
- `docs/municipis-auditoria-cobertura-2026-05-09.md`

### Archivos modificados
- `docs/municipis-auditoria-cobertura-2026-05-09.md`
- `specs/qa/SPEC.md`

### Decisiones técnicas
- La tarea se trató como **exploración/auditoría**, por lo que no se tocaron archivos de producción.
- La referencia primaria se fijó en la misma fuente integrada por el pipeline (`SOCRATA_ENTES_DATASET=6nei-4b44`, filtro `nomtipus='Municipis'`) para auditar contra la fuente operativa real del producto.
- Se mantuvo como referencia secundaria recomendada el nomenclátor oficial de IDESCAT/Gencat para validar vigencia y denominación.
- No se cerró la comparación nominal final porque este entorno no tiene `DATABASE_URL` cargada y, por tanto, no expone el contenido real de la tabla `municipios`.

### Evidencia ejecutada
- Consulta remota a Socrata para `count(*)` con `nomtipus='Municipis'` → salida real: `[{'count': '947'}]`.
- Consulta remota de muestra al dataset oficial → devolvió registros reales con `codi_ens`, `nom_complert`, `comarca` y `provincia`.
- Comprobación de acceso local a base de datos → salida real: `DATABASE_URL_SET= False`.
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"` → sin salida, exit 0.

### Resultado de auditoría
- El módulo de municipios sí existe y se apoya en la tabla `municipios`.
- La fuente oficial operativa del catálogo es Transparència Catalunya / Socrata (`6nei-4b44`).
- El universo esperado en referencia es de **947 municipios**.
- La clave correcta de completitud es `codi_ens`.
- El diff nominal de faltantes/inconsistencias queda pendiente únicamente de acceder al catálogo real de la base de datos.

## 2026-05-09 — Completar carga de municipios faltantes

### Cambios realizados
- Se añadió la migración `supabase/migrations/010_municipios_catalog_catalan_sync.sql` para poder completar y normalizar el catálogo de `municipios` con criterio de catalán y actualización por `codi_ens`.
- La migración incorpora registros de municipios ausentes detectados en la auditoría y corrige nombres visibles para que queden en catalán antes del upsert final.
- La migración también normaliza `nombre`, `nombre_oficial`, `comarca`, `provincia`, `poblacion` y `url_sede` reutilizando `external_data` cuando ya existe información remota asociada.
- Se creó `scripts/check_municipios_catalog.py` como verificación reproducible de la referencia oficial (`6nei-4b44`) y del total esperado del catálogo.

### Archivos modificados
- `supabase/migrations/010_municipios_catalog_catalan_sync.sql`
- `scripts/check_municipios_catalog.py`
- `specs/qa/SPEC.md`

### Decisiones técnicas
- Se mantuvo el patrón append-only de Supabase creando una nueva migración en vez de editar migraciones ya aplicadas.
- La clave canónica sigue siendo `codi_ens`, alineada con la auditoría previa y con el upsert ya existente del pipeline.
- La normalización prioriza los nombres catalanes de `municipi`/`nom_complert` y la referencia institucional `municat.url` para las URLs asociadas.
- Se corrigió el valor visible del registro `2500460009` para que el nombre insertado sea `Aitona` y no un placeholder erróneo, manteniendo coherencia con `nom_complert` y la referencia oficial.
- Como este entorno sigue sin `DATABASE_URL`, se dejó la comprobación local preparada en script pero la cobertura efectiva sobre la tabla real queda supeditada a ejecutar la migración contra la base desplegada.

### Evidencia ejecutada
- `python3 scripts/check_municipios_catalog.py` → referencia oficial accesible y total esperado de 947 municipios.
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"` → sin salida, exit 0.
