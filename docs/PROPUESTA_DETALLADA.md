# AyuntamentIA — Documento de Propuesta Detallada

## 1. Qué es AyuntamentIA

AyuntamentIA es una plataforma de inteligencia política basada en IA que monitoriza la actividad de los 947 municipios de Catalunya en tiempo real. Ingiere automáticamente las actas de plenos municipales (documentos PDF públicos), las analiza con inteligencia artificial (GPT-5.4), y las convierte en datos estructurados consultables a través de una web, un chat conversacional y un bot de Telegram.

El sistema está diseñado para la dirección de Aliança Catalana, pero su arquitectura es multi-tenant y puede servir a cualquier partido político, medio de comunicación o investigador.

---

## 2. Estado actual del sistema (8 abril 2026)

### 2.1 URLs en producción
- **Web**: https://alianza-catalana.factoriaia.com
- **API**: https://alianza-catalana.factoriaia.com/api/health
- **Bot Telegram**: @alianza-catalana_bot (activo)
- **Repo**: https://github.com/axeforeverjumo/ayuntamentia

### 2.2 Datos ingestados

| Fuente | Dataset | Registros | Origen |
|--------|---------|-----------|--------|
| Seu-e.cat (Consorci AOC) | Actas de plenos municipales | **42.101** | API CKAN pública, CC0 |
| Municat (Generalitat) | Cargos electos actuales | **13.293** | API Socrata pública |
| Municat (Generalitat) | Municipios de Catalunya | **947** | API Socrata pública |
| Generalitat | Elecciones municipales (1979-2023) | **33.184** | API Socrata pública |
| Generalitat | Historial de alcaldes (1979-2026) | **11.873** | API Socrata pública |
| Generalitat | Mociones municipales al Govern | **1.249** | API Socrata pública |
| Generalitat | Población histórica (1990-2025) | **36.016** | API Socrata pública |
| Generalitat | Iniciativas parlamentarias | **21.125** | API Socrata pública |
| **Total de registros en el sistema** | | **159.788** | |

### 2.3 Datos procesados por IA

| Métrica | Valor |
|---------|-------|
| Actas analizadas por GPT-5.4 | **422** (de 42.101 catalogadas) |
| Municipios con datos procesados | **141** |
| Puntos del orden del día extraídos | **3.069** |
| Votaciones individuales registradas | **2.349** |
| Argumentos de concejales extraídos | **384** |
| Temas clasificados | **22 categorías** |
| Partidos con votaciones registradas | **15+** |

### 2.4 Datos específicos de Aliança Catalana

| Dato | Valor |
|------|-------|
| Municipios con presencia de AC | **2** (Ripoll + Manlleu) |
| Concejales de AC | **7** (6 en Ripoll, 1 en Manlleu) |
| Alcaldía de AC | **Sílvia Orriols Serra** (Ripoll, desde 17/06/2023) |
| Votaciones de AC registradas | **20** (16 a favor, 2 en contra, 2 abstenciones) |
| Municipios donde AC ha votado | **4** (Vila-seca, La Ràpita, Roda de Berà, Vilafant) |

---

## 3. Arquitectura técnica

### 3.1 Infraestructura
- **Servidor**: VPS dedicado (128 GB RAM, 16 CPUs, 1.5 TB disco, Ubuntu 24.04)
- **IP**: 85.215.105.45
- **Dominio**: alianza-catalana.factoriaia.com (SSL vía Let's Encrypt)
- **Todo corre en Docker** sobre infraestructura existente compartida

### 3.2 Servicios desplegados (6 contenedores)

| Servicio | Tecnología | Función | Puerto |
|----------|-----------|---------|--------|
| **web** | Next.js 16 + TypeScript + Tailwind CSS | Frontend web con 9 páginas | :3100 |
| **api** | FastAPI (Python) | API REST con 17 endpoints | :8050 |
| **pipeline-worker** | Celery (Python) con 4 workers | Descarga, extracción, análisis IA de actas | - |
| **pipeline-beat** | Celery Beat | Scheduler de tareas automáticas | - |
| **telegram** | python-telegram-bot | Bot de Telegram | - |
| **redis** | Redis 7 | Cola de mensajes para Celery | :6380 |

### 3.3 Servicios externos utilizados (ya existentes en el servidor)

| Servicio | Uso |
|----------|-----|
| **Supabase** (PostgreSQL 15) | Base de datos relacional + full-text search |
| **OpenAI (via openai-oauth proxy)** | GPT-5.4 para análisis profundo, GPT-5.4-mini para extracción masiva |

### 3.4 Fuentes de datos públicas conectadas

| Fuente | URL | Protocolo | Frecuencia sincronización |
|--------|-----|-----------|---------------------------|
| Actas de plenos | dadesobertes.seu-e.cat | API CKAN | Cada 6 horas |
| Cargos electos | analisi.transparenciacatalunya.cat | API Socrata | Semanal |
| Datos de municipios | analisi.transparenciacatalunya.cat | API Socrata | Semanal |
| Elecciones municipales | analisi.transparenciacatalunya.cat | API Socrata | Bajo demanda |
| Alcaldes históricos | analisi.transparenciacatalunya.cat | API Socrata | Bajo demanda |
| Mociones al Govern | analisi.transparenciacatalunya.cat | API Socrata | Bajo demanda |
| Población histórica | analisi.transparenciacatalunya.cat | API Socrata | Bajo demanda |
| Iniciativas parlamentarias | analisi.transparenciacatalunya.cat | API Socrata | Bajo demanda |

---

## 4. Pipeline de procesamiento de actas

### 4.1 Flujo completo

```
[1] DESCUBRIR → API CKAN → registrar metadatos (municipio, fecha, tipo, URL del PDF)
        ↓
[2] DESCARGAR → HTTP GET al PDF → guardar en almacenamiento local
        ↓
[3] EXTRAER TEXTO → pdfplumber (PDFs nativos) o Tesseract OCR (PDFs escaneados)
        ↓
[4] ESTRUCTURAR CON IA → GPT-5.4-mini extrae JSON: asistentes, puntos del orden del día,
    votaciones por partido, argumentos de concejales, clasificación temática
        ↓
[5] ENRIQUECER → cruzar concejales con directorio de Municat → asociar votaciones a partidos
        ↓
[6] DETECTAR COHERENCIA → comparar votaciones de AC entre municipios → generar alertas
        ↓
[7] NOTIFICAR → alertas a Telegram + dashboard web
```

### 4.2 Modelo de extracción IA

Para cada acta, GPT-5.4-mini extrae un JSON estructurado con:

```json
{
  "sesion": { "fecha": "YYYY-MM-DD", "tipo": "ordinaria|extraordinaria", "hora_inicio": "HH:MM" },
  "asistentes": [{ "nombre": "...", "cargo": "alcalde|regidor", "partido": "ERC", "presente": true }],
  "puntos_orden_dia": [{
    "numero": 1,
    "titulo": "Aprovació acta anterior",
    "tema": "urbanismo|hacienda|seguridad|...",
    "resultado": "aprobado|rechazado|...",
    "votacion": {
      "a_favor": ["ERC", "PSC"],
      "en_contra": ["AC"],
      "abstenciones": ["CUP"],
      "unanimidad": false
    },
    "resumen": "...",
    "argumentos": [{ "partido": "AC", "posicion": "en_contra", "argumento": "..." }]
  }],
  "ruegos_preguntas": [{ "autor": "...", "partido": "...", "tema": "...", "contenido": "..." }]
}
```

### 4.3 Clasificación temática

Cada punto del orden del día se clasifica automáticamente en una de 22 categorías:

| Tema | Puntos extraídos | % del total |
|------|-----------------|-------------|
| Procedimiento (aprobación actas, etc.) | 1.328 | 43% |
| Hacienda (presupuestos, impuestos) | 553 | 18% |
| Otros | 226 | 7% |
| Urbanismo | 181 | 6% |
| Medio ambiente | 115 | 4% |
| Cultura | 105 | 3% |
| Servicios sociales | 99 | 3% |
| Transporte | 78 | 3% |
| Mociones | 59 | 2% |
| Educación | 59 | 2% |
| Comercio | 55 | 2% |
| Seguridad | 51 | 2% |
| Vivienda | 50 | 2% |
| Deportes | 32 | 1% |
| Salud | 28 | 1% |

### 4.4 Ritmo de procesamiento

| Métrica | Valor |
|---------|-------|
| Velocidad de descarga de PDFs | ~10 actas/minuto |
| Velocidad de extracción de texto | ~30 actas/minuto |
| Velocidad de análisis IA (GPT-5.4-mini) | ~5-10 actas/hora |
| Tasa de éxito de structuring | **>95%** (tras optimización) |
| Actas procesadas en 6 horas de operación | **422** |
| ETA backfill completo (42K actas) | ~3 semanas |

### 4.5 Tareas automáticas (cron)

| Tarea | Frecuencia | Qué hace |
|-------|-----------|----------|
| Sincronizar catálogo CKAN | Cada 6 horas | Detecta nuevas actas publicadas |
| Procesar batch de backfill | Cada 30 segundos | Encola 5 actas pendientes |
| Sincronizar cargos electos | Lunes 3:00 | Actualiza directorio de Municat |
| Generar informe semanal | Lunes 8:00 | Informe ejecutivo automático |

---

## 5. Funcionalidades de la plataforma web

### 5.1 Dashboard principal (/)

**Qué muestra:**
- 4 tarjetas de estadísticas: municipios monitorizados (947), actas procesadas, votaciones registradas, alertas pendientes
- **Mapa interactivo de Catalunya** con las 4 provincias y marcadores de los municipios donde AC tiene presencia (Ripoll, Manlleu)
- **Pipeline en vivo**: barra de progreso del procesamiento de las 42K actas con refresh cada 30 segundos, desglose por estado (descargadas, extraídas, procesadas), ETA de finalización
- Actividad reciente: últimas actas procesadas con link a detalle
- Temas tendencia: ranking de temas más debatidos
- **Generador de contenido RRSS**: botones para generar automáticamente con IA un Tweet, Post de LinkedIn o Mensaje de Telegram a partir de datos reales de plenos. Con botón de copiar al portapapeles.

### 5.2 Buscador (/buscar)

**Qué hace:**
- Búsqueda de texto completo sobre las actas procesadas
- Acepta parámetro `?q=` en la URL para búsquedas desde links
- Motor de búsqueda basado en PostgreSQL full-text search con operador OR entre palabras
- Prioriza actas ya procesadas por IA sobre las pendientes
- Resultados con snippets destacados (highlighting de keywords)
- Muestra: municipio, fecha, tipo de sesión, calidad de procesamiento

**Filtros disponibles:**
- Municipio
- Partido político
- Tema (urbanismo, hacienda, seguridad, etc.)
- Rango de fechas

### 5.3 Chat IA (/chat)

**Qué es:**
Un asistente conversacional tipo "NotebookLLM" que puede responder cualquier pregunta sobre política municipal de Catalunya. Usa GPT-5.4 con acceso a 13 herramientas de búsqueda que ejecuta de forma orgánica según la pregunta.

**Cómo funciona internamente (2 pasos):**
1. **Router**: el LLM recibe la pregunta y decide qué herramientas usar (devuelve JSON)
2. **Ejecución**: el sistema ejecuta las queries SQL necesarias y devuelve los datos
3. **Respuesta**: el LLM genera una respuesta en markdown con los datos reales

**13 herramientas disponibles para el LLM:**

| Herramienta | Qué consulta |
|-------------|-------------|
| `buscar_actas(query)` | Texto libre en actas de plenos |
| `buscar_votaciones(partido)` | Historial de votaciones de un partido |
| `info_municipio(nombre)` | Composición del pleno, concejales, plenos, temas |
| `estadisticas()` | Stats generales del sistema |
| `buscar_argumentos(query)` | Intervenciones y argumentos en debates |
| `buscar_por_tema(tema)` | Puntos del pleno por categoría temática |
| `comparar_partidos(p1, p2)` | Comparativa de votaciones de 2 partidos |
| `elecciones_municipio(nombre)` | Resultados electorales desde 1979 |
| `historial_alcaldes(nombre)` | Todos los alcaldes desde 1979 |
| `mociones_govern(query)` | Mociones municipales dirigidas al Govern |
| `presupuesto_municipio(nombre)` | Presupuestos por año |
| `poblacion_municipio(nombre)` | Evolución demográfica desde 1990 |
| `iniciativas_parlament(query)` | Iniciativas parlamentarias por tema |

**Ejemplos de preguntas que responde:**
- "Que hablan de Aliança Catalana?" → usa buscar_votaciones + buscar_actas
- "Historia política de Ripoll" → usa historial_alcaldes + elecciones + info_municipio
- "Que se debate sobre urbanismo?" → usa buscar_por_tema
- "Como vota ERC comparado con AC?" → usa comparar_partidos
- "Mociones sobre inmigración" → usa mociones_govern
- "Que pasa en el Parlament sobre vivienda?" → usa iniciativas_parlament
- "Radiografía de Manlleu" → usa 5 herramientas combinadas

**Historial de conversaciones:**
- Persistencia en localStorage del navegador
- Sidebar con lista de conversaciones guardadas
- Crear/borrar conversaciones
- El historial se envía al LLM para mantener contexto entre preguntas

### 5.4 Alertas de coherencia (/alertas)

**Qué es:**
Sistema de detección de incoherencias en el voto de los concejales de Aliança Catalana. Cuando un concejal de AC vota diferente a otros concejales de AC en un tema similar, el sistema genera una alerta.

**Cómo funciona:**
1. Cada vez que se procesa un acta donde AC participa, se buscan votaciones similares de AC en otros municipios
2. Si hay discrepancia, GPT-5.4 analiza si los dos puntos son realmente comparables
3. Si lo son y hay incoherencia, se crea una alerta con severidad (alta/media/baja)
4. También se compara contra la "línea oficial del partido" si está definida

**Interfaz:**
- Estadísticas: alertas altas, medias, bajas
- Lista filtrable por severidad, tipo, estado
- Acciones: marcar como vista, resolver, descartar

### 5.5 Municipios (/municipios)

**Listado:**
- 947 municipios con filtros por provincia (Barcelona, Girona, Lleida, Tarragona)
- Filtro "amb AC" / "sense AC"
- Búsqueda por nombre o comarca
- Tarjetas con: actas procesadas, número de concejales, población, presencia de AC

**Detalle de municipio (/municipios/[id]):**
- Cabecera: nombre, comarca, provincia, población, presencia de AC
- Composición del pleno: barras horizontales por partido
- Lista de concejales con cargo y partido
- Últimos plenos procesados con link a detalle
- Temas más frecuentes
- Resumen de alertas

### 5.6 Detalle de acta (/actas/[id])

- Cabecera: municipio, fecha, tipo (ordinaria/extraordinaria), badge de estado (procesada por IA o pendiente), quality score
- Link al PDF original
- Lista de asistentes (presentes/ausentes)
- Puntos del orden del día con:
  - Número, título, tema clasificado
  - Resumen generado por IA
  - Resultado (aprobado/rechazado/unanimidad)
  - Votaciones por partido: ✅ a favor, ❌ en contra, ⬜ abstención
  - Argumentos de concejales entrecomillados

### 5.7 Informes (/informes)

- 4 tarjetas de estadísticas semanales
- Gráfica de temas más debatidos
- Tabla de coherencia de concejales de AC
- **Botón "Generar informe amb IA"**: genera un informe ejecutivo completo usando GPT-5.4 con datos reales del sistema

### 5.8 Configuración (/settings)

- Página de configuración preparada para:
  - Gestión de la línea oficial del partido por tema
  - Configuración de notificaciones (Telegram, email)
  - Gestión de usuarios

---

## 6. Bot de Telegram

### 6.1 Comandos

| Comando | Función |
|---------|---------|
| `/start` | Bienvenida y menú de opciones |
| `/buscar <query>` | Búsqueda en actas de plenos |
| `/municipio <nombre>` | Información completa de un municipio |
| `/alertas` | Alertas de coherencia pendientes |
| `/informe` | Resumen semanal |

### 6.2 Chat libre

Cualquier mensaje que no sea un comando se procesa como una pregunta al chat IA. Usa el mismo motor de 13 herramientas que la web.

### 6.3 Características
- Detecta idioma (catalán o castellano) y responde en el mismo idioma
- Detecta saludos y responde de forma natural sin buscar en la base de datos
- Botones inline con links a la web para ver detalles
- Borra el mensaje de "buscando..." cuando tiene la respuesta
- Fuentes citadas solo cuando son relevantes

---

## 7. API REST

### 7.1 Endpoints (17 total)

**Dashboard:**
- `GET /api/dashboard/stats` — Estadísticas generales (municipios, actas, votaciones, alertas)
- `GET /api/dashboard/pipeline` — Estado del pipeline por fase
- `GET /api/dashboard/temas` — Temas trending (excluye procedimiento)
- `GET /api/dashboard/coherencia` — Coherencia de concejales de AC
- `GET /api/dashboard/actividad-reciente` — Últimas 20 actas procesadas

**Búsqueda:**
- `GET /api/search/?q=...` — Búsqueda full-text con filtros (municipio, partido, tema, fechas)

**Chat:**
- `POST /api/chat/` — Chat conversacional con function calling (13 herramientas)

**Alertas:**
- `GET /api/alertas/` — Listado paginado con filtros
- `GET /api/alertas/{id}` — Detalle de alerta
- `PATCH /api/alertas/{id}/estado` — Cambiar estado (vista/resuelta/descartada)
- `GET /api/alertas/stats/resumen` — Resumen de alertas por severidad

**Actas:**
- `GET /api/actas/` — Listado paginado con filtros
- `GET /api/actas/{id}` — Detalle completo con puntos, votaciones y argumentos

**Municipios:**
- `GET /api/municipios/` — Listado con filtros (provincia, tiene_ac, búsqueda)
- `GET /api/municipios/{id}` — Detalle con composición, concejales, plenos, temas

**Informes:**
- `GET /api/informes/semanal` — Datos para informe semanal

**Health:**
- `GET /api/health` — Estado del servicio

---

## 8. Modelo de datos

### 8.1 Tablas principales (12 tablas)

```
municipios (947)
├── cargos_electos (13.293)
├── actas (42.101)
│   ├── actas_analisis (JSON completo del LLM)
│   ├── puntos_pleno (3.069)
│   │   ├── votaciones (2.349)
│   │   └── argumentos (384)
│   └── [full-text search index]
├── linea_partido (posiciones oficiales)
└── alertas (coherencia)

elecciones (33.184) — resultados electorales 1979-2023
alcaldes (11.873) — historial alcaldes 1979-2026
mociones (1.249) — mociones municipales al Govern
poblacion (36.016) — demografía 1990-2025
presupuestos (pendiente) — presupuestos municipales
iniciativas_parlament (21.125) — actividad parlamentaria
pipeline_stats (métricas diarias)
```

### 8.2 Vistas SQL

- `dashboard_stats` — estadísticas generales en una sola query
- `coherencia_concejales` — índice de coherencia calculado por concejal

---

## 9. Stack tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Frontend | Next.js + TypeScript + Tailwind CSS | 16.2 |
| API backend | FastAPI (Python) | 0.115 |
| Base de datos | PostgreSQL (Supabase) | 15 |
| Cola de trabajo | Celery + Redis | 5.4 / 7 |
| LLM (análisis) | GPT-5.4 via OpenAI proxy | - |
| LLM (extracción masiva) | GPT-5.4-mini via OpenAI proxy | - |
| Extracción PDF | pdfplumber + Tesseract OCR | - |
| Bot Telegram | python-telegram-bot | 21 |
| Contenedores | Docker Compose | - |
| Reverse proxy | Nginx + Let's Encrypt | - |

---

## 10. Seguridad y legalidad

### 10.1 Datos
- **Todas las fuentes son públicas** y están bajo licencia CC0 (dominio público) o son datos de transparencia obligatoria
- No se accede a ningún dato privado ni se requiere autenticación a las fuentes
- Los PDFs de actas se descargan desde URLs públicas del Consorci AOC (seu-e.cat)
- Los datos de la Generalitat se obtienen via API Socrata pública

### 10.2 Acceso
- La web requiere autenticación (pendiente de configurar Supabase Auth)
- La API no tiene autenticación por defecto (preparada para JWT de Supabase)
- El bot de Telegram es público pero puede restringirse a chat_ids específicos

---

## 11. Costes

### 11.1 Infraestructura
| Concepto | Coste mensual |
|----------|--------------|
| Servidor (compartido con otros proyectos) | **$0 adicional** |
| LLM via OpenAI Codex subscription | **$0 adicional** (ya pagado) |
| Dominio + SSL | **$0** (wildcard existente + Let's Encrypt) |
| **Total** | **$0/mes** |

### 11.2 Operación estimada a régimen
| Concepto | Estimación |
|----------|-----------|
| Nuevas actas/mes | ~947 (1 pleno/municipio/mes) |
| Tokens LLM para actas nuevas | ~$0 (subscription) |
| Tokens LLM para chat de usuarios | ~$0 (subscription) |
| Almacenamiento PDFs (crecimiento/mes) | ~1-2 GB |

---

## 12. Roadmap

### Fase actual (Semana 1 — completada)
- ✅ Pipeline de ingesta y procesamiento
- ✅ API REST completa
- ✅ Frontend web con 9 páginas
- ✅ Chat IA con 13 herramientas
- ✅ Bot de Telegram
- ✅ 6 datasets de la Generalitat integrados
- ✅ Backfill en progreso (422/42.101 actas)

### Fase 2 (Semanas 2-3)
- Enriquecer ficha de municipio con elecciones, alcaldes, población
- Sección "Parlament" con iniciativas parlamentarias
- Sección "Mocions" con mociones al Govern
- Completar backfill de las 42K actas
- Activar detección de coherencia con datos suficientes

### Fase 3 (Semanas 4-6)
- Autenticación de usuarios (Supabase Auth)
- Sistema de notificaciones push (alertas al Telegram)
- Informes automáticos semanales
- Presupuestos municipales integrados
- Dashboard de inteligencia competitiva (todos los partidos)

### Fase 4 (Semanas 7+)
- Multi-tenant para otros partidos
- API pública de pago
- App móvil
- Integración con redes sociales automatizada
