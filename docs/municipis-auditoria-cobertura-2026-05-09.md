# Auditoría de cobertura de municipios

Fecha: 2026-05-09
Proyecto: Politica / Pulse
URL objetivo: https://politica.factoriaia.com/municipios

## Objetivo
Verificar si el módulo/catálogo de municipios contiene todos los municipios necesarios y dejar trazable:
1. Fuente oficial de referencia.
2. Método de comparación con el catálogo actual.
3. Listado de faltantes o inconsistencias.

## Resultado de la exploración en repositorio
Se realizó búsqueda global en código con patrón `municip` y no se encontraron coincidencias en el repositorio actual.

Evidencia:
- Comando de búsqueda interna usado por herramienta del entorno: `search_code(pattern="municip", glob="**/*")`
- Resultado: `No matches found.`

### Implicación
Con el estado actual del repositorio local **no se identifica** un módulo, tabla, endpoint o archivo de datos de municipios para auditar internamente.

## Fuente oficial de referencia propuesta
Para Catalunya, la referencia oficial recomendada para completitud de municipios es:
- **IDESCAT / Nomenclàtor oficial de municipis de Catalunya** (fuente estadística/administrativa oficial para codificación municipal).

Alternativas válidas (según disponibilidad operativa del equipo):
- Gencat / Administració local (catálogo oficial territorial).
- INE (tabla nacional de municipios, útil para contraste estatal).

## Criterio de completitud del catálogo (propuesto)
Se considera “completo” cuando se cumplan todos los puntos:
1. **Cobertura 100%** de códigos oficiales vigentes en la fuente de referencia.
2. Cada registro incluye al menos:
   - `codi_municipi` oficial
   - `nom_oficial` (catalán)
   - `provincia/comarca` (si aplica al modelo de datos)
   - `estat_vigencia` (vigente/no vigente si se mantienen históricos)
3. **Sin duplicados** por código oficial.
4. **Normalización de texto** coherente (tildes, apóstrofes, guiones) sin perder forma oficial.
5. Registros locales que no existan en referencia deben marcarse como:
   - alias permitido, o
   - inconsistencia a corregir.

## Comparación catálogo actual vs referencia
Estado: **bloqueada en local** por falta de catálogo local detectable en el repositorio.

Para ejecutar la comparación en siguiente iteración:
1. Identificar la fuente local real de municipios (tabla Supabase, endpoint API o seed CSV).
2. Exportar ambos conjuntos (referencia oficial y catálogo local).
3. Ejecutar diff por `codi_municipi` y por `nom_oficial`.
4. Generar tres listas:
   - faltantes en local
   - sobrantes/no oficiales en local
   - discrepancias de nombre/código

## Checklist del brief
- [x] Obtener la fuente de referencia oficial de municipios. *(definida en este documento)*
- [ ] Comparar el catálogo actual con la referencia. *(pendiente por falta de fuente local en repo)*
- [ ] Generar listado de municipios faltantes o inconsistentes. *(dependiente del punto anterior)*

## Bloqueos y preguntas abiertas
1. ¿Dónde reside actualmente el catálogo de municipios (tabla, endpoint o archivo)?
2. ¿El alcance es Catalunya únicamente o todos los municipios de España?
3. ¿Se requiere incluir históricos (municipios extinguidos/fusionados) o solo vigentes?

## Archivos afectados por esta tarea
- `docs/municipis-auditoria-cobertura-2026-05-09.md` (nuevo)
