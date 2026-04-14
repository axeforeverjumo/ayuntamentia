# Guía del tester — AyuntamentIA

**Producto**: Plataforma de inteligencia política para Aliança Catalana
**URL**: https://alianza-catalana.factoriaia.com
**Servidor**: `root@85.215.105.45` (`/opt/ayuntamentia`)
**Bot Telegram**: `@alianza_catalana_bot`
**Credencial test (admin)**: `test@ayuntamentia.cat` / `Test1234!`

---

## Cómo leer esta guía

Para cada requisito del cliente hay una ficha con 4 bloques:

- **🎯 Qué pidió el cliente** — la frase literal del brief
- **📍 Dónde probarlo** — URL exacta o comando
- **🧪 Pasos de test** — secuencia de clicks/acciones
- **✅ Criterio de aceptación** — qué tiene que ocurrir para dar OK
- **⚠️ Estado conocido** — si hay datos insuficientes o gaps, ya avisados

Al final de cada ficha, marca **PASS / FAIL / BLOQUEADO** y apunta captura + observación.

---

## 0. Setup rápido para el tester

### 0.1 Acceso a la web
1. Abrir https://alianza-catalana.factoriaia.com en Chrome
2. Login con `test@ayuntamentia.cat` / `Test1234!`
3. Deberías ver el **Dashboard** (KPIs + mapa Catalunya + pipeline live)

### 0.2 Acceso al servidor (solo si la tarea lo requiere)
```bash
ssh root@85.215.105.45
cd /opt/ayuntamentia
docker compose ps                  # 6 contenedores Up
docker compose logs -f pipeline-worker   # ver pipeline en vivo
```

### 0.3 Crear usuarios de test adicionales
Con sesión admin → `/admin → Usuaris` → **Nuevo** (o vía SSH `./scripts/create_admin.sh`).
Para probar roles crear al menos: 1 `delegado` con áreas=["medio_ambiente","pesca"] y 1 `concejal` de un municipio concreto.

---

# BLOQUE A — Peticiones explícitas del cliente

## A1. IA como chatbot de análisis (no saturación)

- 🎯 **Cliente**: "La IA debe funcionar como un chatbot de análisis que hable directamente y proporcione las conclusiones solicitadas, evitando la saturación de información."
- 📍 **Dónde**: `/chat`
- 🧪 **Pasos**:
  1. Login como admin → menú lateral **Chat**
  2. Preguntar literalmente: *"¿Qué tendencias hay en medio ambiente este mes en Catalunya?"*
  3. Esperar respuesta (≤30 s)
  4. Probar otra: *"Compara votaciones de ERC y JxCat sobre urbanismo"*
  5. Probar una genérica: *"Hola"*
- ✅ **Criterio**:
  - Respuesta empieza con **veredicto de 1-2 frases** que contesta directamente
  - Máx **3-5 bullets** con cifras concretas (%, números, municipios)
  - Cierra con sección **"¿Y ahora qué?"** con 1-2 acciones/vigilancias
  - Bajo la respuesta aparecen **Fonts** (chips con municipio + fecha)
  - Idioma = idioma de la pregunta
  - "Hola" debe responder saludo corto, sin ejecutar búsquedas
- ⚠️ **Estado**: 16 tools activas, modo análisis forzado por prompt.

---

## A2. Informes personalizados por temática

- 🎯 **Cliente**: "Informes automáticos por temáticas (medio ambiente, comercio, pesca, agricultura, caza) enviados a una bandeja en horario definido (ej. cada viernes)."
- 📍 **Dónde**: `/suscripciones`
- 🧪 **Pasos (modo temas predefinidos)**:
  1. `/suscripciones` → **Nova subscripció**
  2. Nombre: `Brief setmanal medi ambient`
  3. Toggle **Temes predefinits** activado
  4. Seleccionar chips: `medio_ambiente`, `pesca`, `agricultura`, `caza`
  5. Canal: `Email` (o `Tots dos`)
  6. Cron: `0 8 * * 5` (= viernes 8h)
  7. Botón **Crear**
  8. En la lista, botón **Previsualitza**
- ✅ **Criterio**:
  - Aparece modal con brief dry-run con 5 secciones: **Titular / Moviments clau / Eco social / Riscos-oportunitats / Què vigilar**
  - Máx 350 palabras, cifras con contexto
  - Si no hay datos en esos temas, dice "Sense activitat"
- 🧪 **Forzar envío real** (SSH, solo si se requiere validar email/telegram):
  ```bash
  ssh root@85.215.105.45 'cd /opt/ayuntamentia && \
    docker compose exec -T pipeline-worker celery -A src.workers.celery_app \
      call src.workers.tasks.dispatch_subscripciones'
  ```
  Ajustar cron a `*/2 * * * *` para que dispare en 2 min.
- ⚠️ **Estado**: `subscripciones = 0` en producción — el tester debe crear la primera.

---

## A2-bis. Informes con **consulta libre** (añadido reciente)

- 🎯 **Cliente (implícito)**: *"Quiero saber qué se habla de Aliança Catalana"* o *"qué movimientos hace el PP"* — no encaja en chips.
- 📍 **Dónde**: `/suscripciones` → toggle **Consulta lliure**
- 🧪 **Pasos**:
  1. Nombre: `Vigilància AC`
  2. Toggle **Consulta lliure**
  3. Clicar uno de los 4 ejemplos (ej. *"Tot el que es parli d'Aliança Catalana a plens i a premsa"*) o escribir el propio
  4. Canal + cron → **Crear**
  5. **Previsualitza**
- ✅ **Criterio**:
  - El brief interpreta la consulta y trae datos relevantes (votos AC, menciones sociales, actas donde aparece, etc.)
  - Mismo formato que A2
  - Si escribe <10 caracteres, el botón Crear está deshabilitado
- ⚠️ **Estado**: recién desplegado (commit `763c6b3`). Probar los 4 ejemplos sugeridos.

---

## A3. Recepción social integrada

- 🎯 **Cliente**: "Que los informes incluyan acogida y feedback de la sociedad en redes sociales."
- 📍 **Dónde**: `/recepcio` + sección *Eco social* de cualquier brief
- 🧪 **Pasos**:
  1. `/recepcio` → ver grid de temas con distribución sentiment (verde/gris/rojo)
  2. Cambiar filtro de ventana temporal (7d / 14d / 30d)
  3. Click en un tema → timeline de menciones con enlace a la fuente original
  4. Volver a `/suscripciones` → Previsualitzar un brief → buscar sección **Eco social**
- ✅ **Criterio**:
  - Hay al menos 1 tema con distribución de sentimiento
  - Timeline enlaza a URLs externas reales (prensa, Bluesky)
  - Brief cita "Eco social" con agregado numérico (N menciones, X% positivo…)
- ⚠️ **Estado actual**: solo 16 menciones en BD, todas de fuente `ara`. Bluesky y otros RSS no aportan datos → **reportar como BLOQUEADO parcial** si el grid sale vacío.

---

## A4. Anticipación proactiva (alertas)

- 🎯 **Cliente**: "Anticiparse a problemas/discursos municipales, comarcales o en redes antes de que sean públicos."
- 📍 **Dónde**: `/alertes`
- 🧪 **Pasos**:
  1. `/alertes` → listado de alertas
  2. Filtrar por tipo: `incoherencia_interna`, `tendencia_emergente`, `tendencia_geo`, `reaccion_social`
  3. Click en una alerta → detalle con municipio/tema/explicación
  4. **Forzar detector** (SSH):
     ```bash
     ssh root@85.215.105.45 'cd /opt/ayuntamentia && \
       docker compose exec -T pipeline-worker celery -A src.workers.celery_app \
         call src.workers.tasks.detect_emerging'
     ```
- ✅ **Criterio**:
  - Al menos 1 alerta generada tras forzar detector
  - Cada alerta muestra severidad (alta/mitjana/baixa) + explicación + link a fuente
- ⚠️ **Estado**: `alertas = 0` en BD. Detector corre cada 4h pero con umbrales estrictos. **Si tras forzar sigue en 0, reportar como FAIL con nota "revisar umbrales"**.

---

## A5. Expansión al Parlament de Catalunya

- 🎯 **Cliente**: "Aplicar el sistema a sesiones plenarias, comisiones y plenos del Parlament."
- 📍 **Dónde**: `/parlament` + tool del chat
- 🧪 **Pasos**:
  1. `/parlament` → listado de sesiones e iniciativas
  2. En `/chat` preguntar: *"¿Qué iniciativas hay en el Parlament sobre vivienda?"*
  3. En `/chat` preguntar: *"¿Qué contradicciones hay entre lo que dice el PSC en Parlament y lo que hacen sus concejales?"*
- ✅ **Criterio**:
  - `/parlament` muestra iniciativas (debe haber 21.125 en BD)
  - El chat invoca la tool `iniciativas_parlament` y devuelve iniciativas con título/tipo/fecha
  - Página `/intel → Promeses incomplertes` tiene datos
- ⚠️ **Estado**: ✅ iniciativas sí; ❌ **`sesiones_parlament = 0`** (scraper DSPC no puebla). Reportar como PASS parcial.

---

## A6. Énfasis en la capacidad de estudio (iceberg)

- 🎯 **Cliente**: "La potencia está en la capa no visible — volumen masivo procesado."
- 📍 **Dónde**: Dashboard `/` + preguntas al chat que crucen fuentes
- 🧪 **Pasos**:
  1. Dashboard `/` → ver KPIs: municipios monitoreados, actas, votaciones, temas trending
  2. Chat: *"¿Contradicen los socialistas en Girona lo que dicen en el Parlament sobre vivienda?"* (cruza 2 fuentes)
  3. Chat: *"Radiografía de Ripoll"* (cruza 5 tools: info_municipio, historial_alcaldes, elecciones, presupuesto, población)
- ✅ **Criterio**:
  - KPIs dashboard muestran números reales (≥80k actas, ≥50k votos, ≥8k argumentos)
  - Radiografía Ripoll devuelve respuesta integrada de 5 fuentes distintas
- ⚠️ **Estado**: ✅ datos poblados.

---

# BLOQUE B — Seguridad, privacidad y usuarios

## B1. Seguridad de acceso

- 🎯 **Cliente**: "Evitar acceso de personas externas a la organización."
- 📍 **Dónde**: cualquier URL
- 🧪 **Pasos**:
  1. Abrir ventana incógnito sin login
  2. Intentar acceder directamente a https://alianza-catalana.factoriaia.com/chat
  3. Intentar llamada a API sin JWT: `curl -i https://alianza-catalana.factoriaia.com/api/chat/`
- ✅ **Criterio**:
  - Redirect automático a `/login?next=/chat`
  - API devuelve 401 Unauthorized sin JWT
  - HTTPS con certificado válido Let's Encrypt (sin warning del navegador)

---

## B2. RGPD — ofuscación de nombres

- 🎯 **Cliente**: "Gestión RGPD — ofuscar nombres de personas."
- 📍 **Dónde**: `/admin → Usuaris` + login como delegado
- 🧪 **Pasos**:
  1. Sesión admin → `/admin → Usuaris` → editar un delegado → activar checkbox **Anonimizar nombres** → guardar
  2. Abrir otra ventana incógnito, login con ese delegado
  3. En `/chat` preguntar: *"¿Quién intervino en el último pleno de Girona?"*
  4. Revisar respuesta
- ✅ **Criterio**:
  - Personas particulares aparecen como iniciales (ej. `J. G.`)
  - Cargos electos (alcaldes, regidores, diputados) **mantienen nombre completo**
  - Al desactivar el flag, los nombres vuelven a aparecer
- ⚠️ **Estado**: ✅ implementado en `anonymize.py`.

---

## B3. Estructura de usuarios y roles

- 🎯 **Cliente**: "Login con roles (delegados por área) que vean solo su parte."
- 📍 **Dónde**: `/admin → Usuaris`
- 🧪 **Pasos**:
  1. Admin → crear `delegado_ma` con rol `delegado`, áreas=["medio_ambiente","pesca"], municipios=[]
  2. Admin → crear `concejal_ripoll` con rol `concejal`, áreas=[], municipios=[Ripoll]
  3. Login con `delegado_ma` → `/buscar` → buscar "urbanismo" → debe salir vacío o bloqueado
  4. Login con `delegado_ma` → `/buscar` → buscar "medi ambient" → debe haber resultados
  5. Login con `concejal_ripoll` → `/municipis` → solo ve Ripoll (o solo esos datos)
- ✅ **Criterio**:
  - El delegado no ve temas fuera de su scope
  - El concejal no ve municipios ajenos
  - El admin ve todo

---

## B4. Panel admin + trazabilidad (audit log)

- 🎯 **Cliente**: "Panel para dirección que monitorice qué consulta cada delegado — controlar línea ideológica."
- 📍 **Dónde**: `/admin`
- 🧪 **Pasos**:
  1. Sesión admin → `/admin` → pestaña **Resum**: contadores 30d por usuario
  2. Pestaña **Usuaris**: lista con rol, áreas, municipios, última actividad
  3. Pestaña **Audit log**: listado paginado de todas las acciones
  4. En otra sesión, hacer 3 consultas con un delegado
  5. Volver al admin → refrescar audit log → deben aparecer las 3 con timestamp, mensaje, tools usadas, latencia
- ✅ **Criterio**:
  - Cada `chat_query`, `subscripcion_create`, login, export, visualización queda registrada
  - Filtro por usuario funciona
  - Payload contiene la pregunta textual (primeros 500 chars)

---

# BLOQUE C — Otros funcionales

## C1. Monitor de votaciones

- 🎯 **Cliente**: "Cada voto de concejal queda registrado y clasificado."
- 📍 **Dónde**: `/chat` + BD
- 🧪 **Pasos**:
  1. Chat: *"¿Cómo ha votado AC en los últimos plens?"*
  2. SSH verificación:
     ```bash
     docker compose exec -T api python -c "
     import psycopg2,os; c=psycopg2.connect(os.environ['DATABASE_URL']).cursor()
     c.execute(\"select partido,sentido,count(*) from votaciones group by 1,2 order by 1\");
     print(c.fetchall())"
     ```
- ✅ **Criterio**: chat devuelve lista con municipio + tema + sentido + fecha. BD tiene ≥50k votos clasificados por `partido` y `sentido`.

---

## C2. Alertas de incoherencia interna

- 🎯 **Cliente**: "Si en Girona aprueban X y en Tarragona rechazan X, avisar."
- 📍 **Dónde**: `/alertes` filtrado por `incoherencia_interna`
- 🧪 **Pasos**: ver A4. Además, ejecutar query:
  ```sql
  SELECT * FROM alertas WHERE tipo='incoherencia_interna' ORDER BY created_at DESC LIMIT 5;
  ```
- ✅ **Criterio**: aparece al menos 1 alerta tras forzar detector. Cada una referencia 2+ municipios donde el mismo partido votó diferente el mismo tipo de punto.

---

## C3. Mapa de discurso

- 🎯 **Cliente**: "Qué argumentos usa cada concejal y si son consistentes."
- 📍 **Dónde**: `/chat` (tool `buscar_argumentos`)
- 🧪 **Pasos**:
  1. Chat: *"¿Qué argumentos ha usado ERC sobre inmigración en los últimos meses?"*
  2. Chat: *"¿Qué dice [nombre concejal AC] en sus intervenciones?"*
- ✅ **Criterio**: respuesta cita intervenciones textuales con concejal, municipio, fecha y posición (a favor/en contra). Debe haber ≥5 intervenciones citadas.

---

## C4. Ranking interno de concejales

- 🎯 **Cliente**: "Ranking alineados vs divergentes, uso interno de dirección."
- 📍 **Dónde**: `/intel → Ranking concejales`
- 🧪 **Pasos**:
  1. `/intel` → pestaña **Ranking concejales**
  2. Filtro partido = `AC`, orden = `divergencia`
  3. Probar también orden = `alineación`
- ✅ **Criterio**:
  - Tabla con columnas: concejal, municipio, partido, % alineación, nº votos
  - Orden divergencia muestra los que **más se salen** de la línea del partido arriba
  - Orden alineación muestra los más fieles arriba
- ⚠️ **Estado**: vista `v_ranking_concejales` tiene 33 filas.

---

## C5. Informe semanal automático para la dirección

- 🎯 **Cliente**: "Informe semanal automático para la dirección del partido."
- 📍 **Dónde**: `/informes` + email/Telegram dirección
- 🧪 **Pasos**:
  1. `/informes` → pestaña **Setmanal** → ver histórico
  2. Forzar ejecución:
     ```bash
     ssh root@85.215.105.45 'cd /opt/ayuntamentia && \
       docker compose exec -T pipeline-worker celery -A src.workers.celery_app \
         call src.workers.tasks.weekly_report'
     ```
  3. Esperar 30-60s, refrescar `/informes`
- ✅ **Criterio**: aparece nueva entrada en el listado con fecha de hoy y contenido coherente (titular + movimientos + eco + riesgos + vigilar).

---

## C6. Inteligencia competitiva

### C6.1 Saber qué aprueban rivales
- 🧪 Chat: *"¿Qué aprueba el PSC en municipios donde gobierna?"*
- ✅ Respuesta con lista de puntos aprobados filtrados por partido proponente.

### C6.2 Contradicciones discurso nacional vs municipal
- 🧪 `/intel → Promeses incomplertes` + chat: *"¿Dónde defiende el PP una cosa en Parlament y la contraria en ayuntamientos?"*
- ✅ Tabla con tema, posición Parlament, posición municipal, municipios afectados.
- ⚠️ **Estado**: vista `v_contradicciones_rival` = 0 filas actualmente (depende de `sesiones_parlament`).

### C6.3 Propuestas que prosperan y con qué argumentos
- 🧪 Chat: *"¿Qué propuestas de vivienda han prosperado y cuáles se han rechazado?"*
- ✅ Separa aprobadas/rechazadas con cifras y argumentos clave de cada lado.

---

## C7. Conocer el territorio

- 🧪 **Pasos**:
  1. `/municipis` → elegir municipio → ver radiografía
  2. `/intel → Tendències emergents` → ver los 9+ temas en crecimiento
  3. Chat: *"¿Qué preocupa más en Manlleu?"*
- ✅ **Criterio**:
  - Página municipio muestra: composición del pleno, alcaldes históricos, elecciones, presupuestos, últimos plens, temas recurrentes
  - Tendencias emergentes lista temas con delta vs 30d anteriores

---

## C8. Preparar concejales

### C8.1 Argumentos de la oposición
- 🧪 Chat: *"¿Qué argumentos usa Junts contra las ordenanzas de civismo?"*
- ✅ Devuelve intervenciones de Junts en plens con posición en contra.

### C8.2 Buenas prácticas propias
- 🧪 Chat: *"¿Qué mociones ha ganado AC este año?"*
- ✅ Lista puntos con resultado `aprobado` y partido proponente `AC`.

### C8.3 Divergentes propios
- 🧪 `/intel → Ranking concejales` partido=AC orden=divergencia
- ✅ Los 5 de arriba son los que más se salen de la línea.

---

## C9. Comunicación y medios

### C9.1 Titulares para notas de prensa
- 🧪 Chat: *"Dame 3 casos concretos esta semana en medio ambiente para una nota de prensa"*
- ✅ 3 hechos con municipio + fecha + cifra + fuente.

### C9.2 Promesas incumplidas rivales
- 🧪 `/intel → Promeses incomplertes`
- ✅ Listado de contradicciones con link a acta municipal + iniciativa parlament.

### C9.3 Contenido RRSS localizado
- 🧪 En el `/chat`, tras una respuesta con datos, usar el componente **GeneradorRRSS** con 4 botones
- ✅ Genera 4 formatos:
  - **Tweet**: ≤260 caracteres, gancho + dato + CTA + 1-2 hashtags
  - **LinkedIn**: hook + 3-4 bullets + tesis + pregunta abierta
  - **Telegram**: título negrita + 3 bullets emoji + CTA
  - **Localizado**: *"En el teu municipi votaren X, en el veí Y…"*

---

## C10. Rendición de cuentas

### C10.1 Demostrar gestión AC
- 🧪 Chat: *"Lista todo lo aprobado por AC este trimestre en Catalunya"*
- ✅ Lista agregada por municipio con cifras totales.

### C10.2 Informes de gestión por municipio
- 🧪 `/suscripciones` → modo **Consulta lliure** → *"Resumen de gestió AC a [municipio]"* → cron mensual
- ✅ Previsualiza brief específico de ese municipio.
- ⚠️ **Estado**: no hay botón "auto-generar gestión" dedicado en `/informes` (roadmap §18.2 del spec).

---

# BLOQUE D — Script de humo (ejecución SSH)

Guardar como `smoke.sh` y ejecutar tras cada deploy:

```bash
#!/bin/bash
ssh root@85.215.105.45 'bash -s' <<'REMOTE'
cd /opt/ayuntamentia
echo "=== [1] containers ==="
docker compose ps --format "table {{.Service}}\t{{.Status}}"

echo "=== [2] counts ==="
docker compose exec -T api python <<PY
import psycopg2,os
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.autocommit=True; c=conn.cursor()
for t in ["municipios","actas","puntos_pleno","votaciones","argumentos","alertas",
         "mencion_social","sesiones_parlament","iniciativas_parlament",
         "user_profiles","subscripciones","usage_log"]:
    c.execute(f"select count(*) from {t}"); print(f"  {t:25s} {c.fetchone()[0]}")
c.execute("select status,count(*) from actas group by 1 order by 2 desc"); print("  actas status:",c.fetchall())
for v in ["v_ranking_concejales","v_tendencias_emergentes","v_contradicciones_rival"]:
    c.execute(f"select count(*) from {v}"); print(f"  {v:30s} {c.fetchone()[0]}")
PY

echo "=== [3] forzar crons clave ==="
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.detect_emerging
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.dispatch_subscripciones
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.weekly_report

echo "=== [4] HTTPS ==="
curl -sk -o /dev/null -w "  login %{http_code}\n" https://alianza-catalana.factoriaia.com/login
curl -sk -o /dev/null -w "  chat  %{http_code}\n" https://alianza-catalana.factoriaia.com/chat
curl -sk -o /dev/null -w "  api   %{http_code}\n" https://alianza-catalana.factoriaia.com/api/health
REMOTE
```

---

# BLOQUE E — Tabla de reporte del tester

Copiar a un Google Sheet y marcar:

| Ref | Título | Resultado | Captura | Observación |
|---|---|---|---|---|
| A1 | Chatbot análisis | | | |
| A2 | Informes por temática | | | |
| A2-bis | Consulta libre | | | |
| A3 | Recepción social | | | |
| A4 | Alertas proactivas | | | |
| A5 | Parlament Catalunya | | | |
| A6 | Iceberg / estudio | | | |
| B1 | Seguridad acceso | | | |
| B2 | RGPD ofuscación | | | |
| B3 | Roles y scope | | | |
| B4 | Audit log admin | | | |
| C1 | Monitor votaciones | | | |
| C2 | Alertas incoherencia | | | |
| C3 | Mapa de discurso | | | |
| C4 | Ranking concejales | | | |
| C5 | Informe semanal dirección | | | |
| C6.1 | Qué aprueban rivales | | | |
| C6.2 | Contradicciones rivales | | | |
| C6.3 | Qué propuestas prosperan | | | |
| C7 | Conocer territorio | | | |
| C8.1 | Argumentos oposición | | | |
| C8.2 | Buenas prácticas propias | | | |
| C8.3 | Divergentes propios | | | |
| C9.1 | Titulares prensa | | | |
| C9.2 | Promesas incumplidas | | | |
| C9.3 | RRSS localizado | | | |
| C10.1 | Gestión AC agregada | | | |
| C10.2 | Gestión por municipio | | | |

Resultado = `PASS` / `FAIL` / `BLOQUEADO` / `PARCIAL`.

---

# BLOQUE F — Gaps conocidos a reportar directamente como ⚠️

Para ahorrarle trabajo al tester, estos ya están identificados:

| # | Gap | Ref tests afectados |
|---|---|---|
| 1 | `sesiones_parlament = 0` (scraper DSPC caído) | A5, C6.2 |
| 2 | Solo 16 menciones sociales y solo fuente `ara` | A3, A4 (`reaccion_social`) |
| 3 | `alertas = 0` — umbrales demasiado estrictos | A4, C2 |
| 4 | `presupuestos = 0` — dataset no cargado | C7 (campo vacío en radiografía) |
| 5 | Solo 1 usuario real en BD | B3 (hay que crearlos) |
| 6 | No hay botón "gestión auto" en `/informes` | C10.2 (workaround: consulta libre) |

Si el tester encuentra el gap, basta con decir *"reproduce gap #N de BLOQUE F"*.

---

# BLOQUE G — Contacto

- **Dudas producto**: Juan Manuel
- **Dudas técnicas / servidor caído**: Juan Manuel (`root@85.215.105.45`)
- **Reset credenciales test**: `./scripts/create_admin.sh` en el VPS
