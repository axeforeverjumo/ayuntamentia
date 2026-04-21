# AjuntamentIA - Análisis de Fuentes de Datos

## Resumen ejecutivo

Se han investigado las 4 fuentes principales de datos sobre plenos municipales en Catalunya.
La estrategia óptima combina **Municat** (directorio de cargos electos) + **Seu-e.cat** (actas de plenos en PDF) + **LLM para extracción estructurada**.

---

## 1. Seu-e.cat — Consorci AOC (FUENTE PRINCIPAL DE ACTAS)

### Datos disponibles
- **138.815 registros** de actas de plenos
- **1.254 entidades** usan la plataforma
- Licencia: **CC0** (dominio público)
- Actualización: cada 30 días

### API CKAN (pública, sin autenticación)

```bash
# Dataset completo en CSV
GET https://dadesobertes.seu-e.cat/csv/agn-ag-actes-de-ple.csv

# API JSON con paginación
GET https://dadesobertes.seu-e.cat/api/action/datastore_search?resource_id=b5d370d0-7916-48b6-8a69-3c7fa62a1467&limit=100&offset=0

# Filtrar por municipio
GET https://dadesobertes.seu-e.cat/api/action/datastore_search?resource_id=b5d370d0-7916-48b6-8a69-3c7fa62a1467&filters={"CODI_ENS":"811200000"}
```

### Campos del dataset

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | int | ID de registro |
| `DATA_ACORD` | timestamp | Fecha de la sesión |
| `TIPUS` | text | Tipo (ordinaria, extraordinaria) |
| `ENLLAÇ_ACTA` | text | **URL directa al PDF** |
| `CODI_ACTA` | text | Código identificador |
| `CODI_ENS` | numeric | Código del ente/municipio |
| `NOM_ENS` | text | Nombre del municipio |

### Formato PDFs
- URL patrón: `https://media.seu-e.cat/acteca/{CODI_ENS}/{YEAR}/{UUID}/{filename}.pdf`
- No tienen formato estandarizado de nombre
- Contenido típico: asistentes, orden del día, votaciones, acuerdos, ruegos y preguntas

---

## 2. Municat / Transparència Catalunya (DIRECTORIO MAESTRO)

### Datos disponibles
- **947 municipios** (cobertura 100% Catalunya)
- **10.591 cargos electos** con partido político
- Última actualización: abril 2026
- Plataforma: Socrata

### API SODA (pública, sin autenticación)

```bash
# Todos los cargos electos municipales (JSON)
GET https://analisi.transparenciacatalunya.cat/resource/nm3n-3vbj.json?$where=tipus_ens='Municipis'

# Filtrar por partido político
GET https://analisi.transparenciacatalunya.cat/resource/nm3n-3vbj.json?$where=partit_politic='ALIANÇA CATALANA'

# Datos generales de todos los municipios
GET https://analisi.transparenciacatalunya.cat/resource/6nei-4b44.json?$where=nomtipus='Municipis'

# Bulk CSV
GET https://analisi.transparenciacatalunya.cat/api/views/nm3n-3vbj/rows.csv?accessType=DOWNLOAD
```

### Campos clave del dataset de cargos electos

| Campo | Descripción |
|-------|-------------|
| `codi_10` | Código oficial del ente |
| `nom_ens` | Nombre del ayuntamiento |
| `tipus_ens` | Tipo (Municipis, Comarques...) |
| `nom` | Nombre del cargo electo |
| `carrec` | Cargo (Alcalde/essa, Regidor/a) |
| `partit_politic` | **Partido político** |
| `ordre` | Posición en el pleno |
| `area` | Área de responsabilidad |
| `comarca` | Comarca |
| `data_nomenament` | Fecha de nombramiento |

---

## 3. DIBA — Arxius Municipals Digitals (HISTÓRICO)

- **245.600 actas** digitalizadas (1644-1968)
- Solo provincia de Barcelona (103 municipios digitalizados)
- PDFs escaneados SIN OCR
- ASP clásico, sin API
- **No relevante para monitoreo político actual**, pero útil para contexto histórico

---

## 4. OpenData BCN (SOLO BARCELONA CIUDAD)

- **No hay datasets de votaciones** en Open Data BCN
- Las actas están en BCNROC (DSpace): 1.445 documentos (2008-2026)
- Protocolo OAI-PMH disponible: `https://bcnroc.ajuntament.barcelona.cat/oai/request`
- Web de Acords del Plenari tiene protección anti-scraping (HTTP 418)
- Para Barcelona se necesita tratamiento especial (BCNROC + posible scraping con headless browser)

---

## Estrategia de adquisición de datos recomendada

### Fase 1: Directorio base
1. Descargar dataset completo de cargos electos de Municat (Socrata API)
2. Identificar todos los concejales de Aliança Catalana y sus municipios
3. Cruzar con dataset de datos generales de entes para enriquecer

### Fase 2: Inventario de actas
1. Descargar CSV completo de actas de seu-e.cat (138K+ registros)
2. Filtrar por municipios de interés (los de AC + todos para inteligencia competitiva)
3. Mapear CODI_ENS entre ambos datasets

### Fase 3: Descarga y procesamiento de PDFs
1. Descargar PDFs vía URLs del dataset
2. Extraer texto (la mayoría son PDFs nativos, no escaneados)
3. Enviar a LLM para extracción estructurada

### Fase 4: Barcelona (caso especial)
1. Usar OAI-PMH de BCNROC para metadatos
2. Scraping con headless browser si es necesario
3. O monitoreo manual hasta encontrar vía programática
