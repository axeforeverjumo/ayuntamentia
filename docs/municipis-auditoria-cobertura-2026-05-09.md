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
La exploración inicial por texto libre con `search_code(pattern="municip", glob="**/*")` devolvió `No matches found.`, pero una inspección más amplia del repositorio sí permitió localizar el catálogo y su flujo operativo real.

### Evidencia del catálogo real localizado
Archivos encontrados y revisados:
- `supabase/migrations/001_schema.sql`
  - Define la tabla `municipios`.
- `api/src/routes/municipios.py`
  - Expone el módulo/endpoint `/api/municipios` y consulta la tabla `municipios`.
- `pipeline/src/ingesta/socrata_client.py`
  - Implementa `sync_municipios()` y descarga el catálogo desde Socrata/Municat.
- `scripts/seed_data.py`
  - Invoca `sync_all()` para sincronizar `municipios` + `cargos electos`.
- `pipeline/src/config.py` y `.env.example`
  - Documentan la fuente remota vía `SOCRATA_BASE_URL=https://analisi.transparenciacatalunya.cat` y `SOCRATA_ENTES_DATASET=6nei-4b44`.

### Qué existe hoy en datos/código
Según `supabase/migrations/001_schema.sql`, el catálogo local esperado vive en:

```sql
CREATE TABLE IF NOT EXISTS municipios (
    id              SERIAL PRIMARY KEY,
    codi_ens        VARCHAR(20) UNIQUE NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    nombre_oficial  VARCHAR(200),
    comarca         VARCHAR(100),
    provincia       VARCHAR(50),
    poblacion       INTEGER,
    url_sede        TEXT,
    tiene_ac        BOOLEAN DEFAULT FALSE,
    external_data   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

Y según `pipeline/src/ingesta/socrata_client.py`, la carga actual del catálogo hace:
- consulta a Socrata con `SOCRATA_ENTES_DATASET=6nei-4b44`
- filtro `nomtipus='Municipis'`
- upsert por `codi_ens`
- rellena `nombre`, `nombre_oficial`, `comarca`, `provincia`, `poblacion`, `url_sede`, `external_data`

## Fuente de referencia oficial
### Fuente operativa que ya usa el sistema
La fuente de referencia que **ya está integrada en el proyecto** es:
- **Transparència Catalunya / Socrata — dataset de ens locales**
- Base URL: `https://analisi.transparenciacatalunya.cat`
- Dataset configurado: `6nei-4b44`
- Filtro aplicado por el pipeline: `nomtipus='Municipis'`

Esta es la referencia más consistente para la auditoría inmediata, porque:
1. es la fuente realmente usada por el pipeline actual,
2. ya aporta `codi_ens` y metadatos territoriales,
3. evita comparar el catálogo local contra una fuente distinta a la que alimenta producción.

### Fuente oficial de contraste recomendada
Como doble validación institucional, se recomienda contrastar además con:
- **IDESCAT / Nomenclàtor oficial de municipis de Catalunya**

Uso recomendado:
- **Referencia primaria de auditoría operativa**: dataset Socrata/Municat configurado en el proyecto.
- **Referencia secundaria de control**: nomenclátor oficial de IDESCAT/Gencat para validar vigencia y denominación oficial.

## Criterio de completitud del catálogo
Se considera que el catálogo de municipios está “completo” cuando se cumplen todos estos puntos:

1. **Cobertura 100%** de todos los registros devueltos por la fuente de referencia operativa (`SOCRATA_ENTES_DATASET=6nei-4b44`, filtrado por `nomtipus='Municipis'`).
2. Cada municipio local tiene **`codi_ens` único y no nulo**.
3. No existen **duplicados por `codi_ens`** en la tabla local.
4. Cada municipio local contiene como mínimo:
   - `codi_ens`
   - `nombre`
   - `nombre_oficial` (si la fuente lo proporciona)
   - `comarca`
   - `provincia`
5. Si un municipio existe en referencia pero no en local, se considera **faltante**.
6. Si un municipio existe en local pero no en referencia operativa, se considera **sobrante o desactualizado** hasta validar si es histórico/alias.
7. Si el `codi_ens` coincide pero el nombre o metadatos territoriales difieren, se considera **inconsistencia**.
8. Para efectos del módulo `/municipios`, el criterio funcional mínimo es que el endpoint API y el frontend puedan cubrir el **universo completo de municipios vigentes de Catalunya** que la fuente integrada clasifica como `Municipis`.

## Comparación catálogo actual vs referencia
### Estado de la comparación
La comparación **no puede cerrarse en esta iteración local** porque el repositorio contiene:
- el esquema,
- el endpoint,
- el pipeline de carga,

pero **no contiene un volcado de datos actual** de la tabla `municipios`, ni una exportación versionada del dataset remoto ya sincronizado.

En otras palabras: sí se ha localizado la fuente y el mecanismo de carga, pero no hay evidencia local en el repo del contenido efectivo actual de la tabla para calcular el diff final de cobertura.

### Qué sí queda demostrado
1. El proyecto **sí tiene** módulo de municipios.
2. El catálogo local esperado vive en la tabla `municipios`.
3. El catálogo se alimenta desde **Socrata/Municat** mediante `sync_municipios()`.
4. La clave de comparación correcta es **`codi_ens`**.
5. El criterio de completitud puede formalizarse con precisión aunque falte el snapshot de datos local.

## Procedimiento exacto para cerrar la auditoría de cobertura
Para obtener el listado real de faltantes/inconsistencias en siguiente iteración u entorno con datos:

1. Extraer la referencia remota oficial usada por el sistema:
   - dataset `6nei-4b44`
   - filtro `nomtipus='Municipis'`
2. Extraer el catálogo local actual de Postgres:
   ```sql
   SELECT codi_ens, nombre, nombre_oficial, comarca, provincia
   FROM municipios
   ORDER BY codi_ens;
   ```
3. Cruce primario por `codi_ens`.
4. Generar tres listas:
   - **faltantes**: presentes en referencia y ausentes en local
   - **sobrantes**: presentes en local y ausentes en referencia
   - **inconsistencias**: `codi_ens` presente en ambos pero con diferencias relevantes en nombre/comarca/provincia
5. Verificar el total final esperado frente al universo de municipios vigentes de Catalunya que entregue la referencia remota en ese momento.

## Listado de faltantes o inconsistencias
### Resultado en esta iteración
No se puede emitir todavía un listado nominal de faltantes/inconsistencias porque el repositorio local no incluye el contenido actual de la tabla `municipios` ni se ha consultado una base de datos poblada desde este entorno.

### Resultado documental sí disponible
Queda preparado y documentado:
- la **fuente de referencia**,
- la **fuente local real del catálogo**,
- la **clave de comparación**,
- el **criterio de completitud**,
- el **procedimiento exacto** para generar el diff cuando se disponga del snapshot real.

## Checklist del brief
- [x] Obtener la fuente de referencia oficial de municipios.
- [ ] Comparar el catálogo actual con la referencia. *(pendiente de disponer del contenido actual de la tabla `municipios` en un entorno con datos)*
- [ ] Generar listado de municipios faltantes o inconsistentes. *(depende de la comparación real anterior)*

## Bloqueos y preguntas abiertas
1. ¿Se puede acceder al Postgres/Supabase local o de staging para exportar el contenido actual de `municipios`?
2. ¿La auditoría debe considerar solo municipios vigentes o también históricos/fusionados?
3. ¿La referencia contractual final debe ser exclusivamente Socrata/Municat o también nomenclátor IDESCAT como validación obligatoria?

## Archivos afectados por esta tarea
- `docs/municipis-auditoria-cobertura-2026-05-09.md`
