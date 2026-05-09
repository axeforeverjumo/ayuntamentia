# Auditoría de cobertura de municipios

Fecha: 2026-05-09
Proyecto: Politica / Pulse
URL objetivo: https://politica.factoriaia.com/municipios

## Objetivo
Verificar si el módulo/catálogo de municipios contiene todos los municipios necesarios y dejar trazable:
1. Fuente oficial de referencia.
2. Comparación con el catálogo actual disponible en este entorno.
3. Listado de faltantes o inconsistencias.
4. Criterio operativo de completitud del catálogo.

## Resultado de la exploración del repositorio
Se revisaron los componentes que materializan el módulo de municipios:

- `supabase/migrations/001_schema.sql`
  - Define la tabla `municipios`.
- `api/src/routes/municipios.py`
  - Expone el módulo `/api/municipios` y consulta la tabla `municipios`.
- `pipeline/src/ingesta/socrata_client.py`
  - Implementa `sync_municipios()` y descarga el catálogo desde Socrata.
- `pipeline/src/config.py`
  - Declara `SOCRATA_BASE_URL` y `SOCRATA_ENTES_DATASET`.
- `.env.example`
  - Documenta los valores por defecto de la fuente remota.
- `scripts/seed_data.py`
  - Usa `sync_all()` para poblar municipios y cargos electos.

## Catálogo actual del proyecto
### Esquema local
Según `supabase/migrations/001_schema.sql`, el catálogo local esperado vive en la tabla:

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

### Mecanismo de carga real
Según `pipeline/src/ingesta/socrata_client.py`, el sistema sincroniza municipios así:

- usa `SOCRATA_BASE_URL=https://analisi.transparenciacatalunya.cat`
- usa `SOCRATA_ENTES_DATASET=6nei-4b44`
- filtra con `nomtipus='Municipis'`
- hace upsert por `codi_ens`
- persiste `nombre`, `nombre_oficial`, `comarca`, `provincia`, `poblacion`, `url_sede`, `external_data`

## Fuente de referencia oficial
### Referencia operativa primaria
La referencia oficial ya integrada en el proyecto es:

- **Transparència Catalunya / Socrata**
- Base URL: `https://analisi.transparenciacatalunya.cat`
- Dataset: `6nei-4b44`
- Filtro operativo del pipeline: `nomtipus='Municipis'`

### Evidencia ejecutada contra la fuente oficial
Se ejecutó una consulta real al dataset remoto para validar el universo esperado:

```python
base='https://analisi.transparenciacatalunya.cat/resource/6nei-4b44.json'
$params={'$select':'count(*)', '$where': "nomtipus='Municipis'"}
```

Salida real:

```text
[{'count': '947'}]
```

Conclusión: la referencia operativa oficial devuelve **947 municipios**.

### Muestra real de registros de referencia
Se consultaron también registros de muestra ordenados por `codi_ens`:

```text
{'codi_ens': '0800180001', 'nom_complert': "Ajuntament d'Abrera", 'nom_curt': None, 'comarca': 'Baix Llobregat', 'provincia': 'Barcelona', 'nomtipus': 'Municipis'}
{'codi_ens': '0800230008', 'nom_complert': "Ajuntament d'Aguilar de Segarra", 'nom_curt': None, 'comarca': 'Bages', 'provincia': 'Barcelona', 'nomtipus': 'Municipis'}
{'codi_ens': '0800390004', 'nom_complert': "Ajuntament d'Alella", 'nom_curt': None, 'comarca': 'Maresme', 'provincia': 'Barcelona', 'nomtipus': 'Municipis'}
{'codi_ens': '0800440003', 'nom_complert': "Ajuntament d'Alpens", 'nom_curt': None, 'comarca': 'Lluçanès', 'provincia': 'Barcelona', 'nomtipus': 'Municipis'}
{'codi_ens': '0800570005', 'nom_complert': "Ajuntament de l'Ametlla del Vallès", 'nom_curt': None, 'comarca': 'Vallès Oriental', 'provincia': 'Barcelona', 'nomtipus': 'Municipis'}
```

### Referencia secundaria recomendada
Como control institucional adicional, se recomienda contrastar también con:

- **IDESCAT / Nomenclàtor oficial de municipis de Catalunya**

Uso recomendado:
- auditoría operativa: Socrata (`6nei-4b44`)
- validación institucional de denominación/vigencia: IDESCAT/Nomenclàtor

## Comparación con el catálogo actual disponible en este entorno
### Estado del catálogo local en esta iteración
Se ejecutó una comprobación real para determinar si este entorno local dispone de acceso a la base de datos actual:

Salida real:

```text
DATABASE_URL_SET= False
```

Conclusión:
- en este entorno **no hay `DATABASE_URL` configurada**;
- por tanto, **no se puede leer la tabla `municipios` real**;
- en consecuencia, no es posible calcular aquí el diff nominal entre catálogo local y referencia oficial.

### Qué sí queda verificado
1. El módulo de municipios existe en esquema, API y pipeline.
2. La fuente oficial integrada devuelve un universo de **947** municipios.
3. La clave de correspondencia correcta es **`codi_ens`**.
4. El pipeline está preparado para hacer upsert del catálogo oficial en `municipios`.

## Criterio de completitud del catálogo
Se considera que el catálogo está completo cuando se cumplen todos estos puntos:

1. La tabla `municipios` contiene **947 registros vigentes** o exactamente el total que devuelva la referencia oficial al momento de la auditoría.
2. Todos los registros de referencia `nomtipus='Municipis'` están presentes en local.
3. Cada municipio tiene `codi_ens` único y no nulo.
4. No hay duplicados por `codi_ens`.
5. Cada registro local mantiene, como mínimo:
   - `codi_ens`
   - `nombre`
   - `nombre_oficial` cuando la fuente lo informe
   - `comarca`
   - `provincia`
6. Si un `codi_ens` está en referencia y no en local, es **faltante**.
7. Si un `codi_ens` está en local y no en referencia, es **sobrante o desactualizado**.
8. Si coincide `codi_ens` pero difieren nombre/comarca/provincia, es **inconsistencia**.

## Listado de faltantes o inconsistencias
### Resultado real de esta iteración
No se puede emitir todavía un listado nominal de faltantes, sobrantes o inconsistencias porque el entorno no expone la base de datos actual del proyecto.

### Resultado documental entregado
Sí queda entregado y verificado:
- la fuente oficial operativa,
- el total esperado de municipios en referencia (**947**),
- la clave de comparación (`codi_ens`),
- el criterio formal de completitud,
- la evidencia concreta del bloqueo local (`DATABASE_URL_SET= False`).

## Procedimiento exacto para cerrar el diff nominal
Cuando se disponga de acceso al catálogo actual, ejecutar:

1. Extraer referencia oficial:
   ```sql
   referencia = dataset 6nei-4b44 filtrado por nomtipus='Municipis'
   ```
2. Extraer catálogo local:
   ```sql
   SELECT codi_ens, nombre, nombre_oficial, comarca, provincia
   FROM municipios
   ORDER BY codi_ens;
   ```
3. Cruzar por `codi_ens`.
4. Generar tres listas:
   - faltantes
   - sobrantes
   - inconsistencias
5. Confirmar que el total local coincide con el total de referencia vigente.

## Checklist del brief
- [x] Obtener la fuente de referencia oficial de municipios.
- [ ] Comparar el catálogo actual con la referencia. *(bloqueado en este entorno por ausencia de `DATABASE_URL` y, por tanto, sin acceso al catálogo real)*
- [ ] Generar listado de municipios faltantes o inconsistentes. *(depende de la comparación real anterior)*

## Archivos afectados por esta tarea
- `docs/municipis-auditoria-cobertura-2026-05-09.md`
