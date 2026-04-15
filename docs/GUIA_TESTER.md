# Guía del tester — AyuntamentIA

**Versió**: 2 (2026-04-15) — incorpora les millores post-feedback del primer test
**URL**: https://alianza-catalana.factoriaia.com
**Servidor**: `root@85.215.105.45` (`/opt/ayuntamentia`)
**Bot Telegram**: `@alianza_catalana_bot`
**Credencial test (admin)**: `test@ayuntamentia.cat` / `Test1234!`

---

## 🆕 Què ha canviat respecte a la v1

| Feedback v1 | Solució v2 |
|---|---|
| Respostes del chat sense format | Render markdown amb títols, bullets, taules, negreta (classe `.markdown-body`) |
| Camp cron críptic (`0 8 * * 5`) | Selector amigable **Diari/Setmanal/Mensual** + dia + hora, amb frase humana i cron crud a sota |
| Botó "Previsualitza" sense feedback | Modal amb spinner *"Generant brief… pot trigar 10-30 s"* |
| Modal del brief sense format | Render markdown estructurat (H2 per secció) |
| "Moviments clau" amb 3× "Sense activitat" | Prompt reescrit: una sola línia quan no hi ha dades |
| Rang temporal fixat (7d) no seleccionable | Nou camp **Finestra temporal** (7/14/30/90 dies) |
| `/recepcio` visualment pobre | Redisseny: KPIs globals, grid de temes clicable, timeline amb dots de sentiment, skeleton loader, empty states |
| 0 alertes generades | Detector reescrit (llindars + fallback + nou detector SQL incoherències). Ara: **3 tendències + 10 incoherències** |

---

## Cómo leer esta guía

Cada caso té:

- 🎯 **Qué pidió el cliente** — la frase literal del brief
- 📍 **Dónde probarlo** — URL exacta o comando
- 🧪 **Pasos de test** — secuencia de clicks/acciones
- ✅ **Criterio de aceptación** — qué tiene que ocurrir para dar OK
- ⚠️ **Estado conocido** — si hay datos insuficientes o gaps

Marca **PASS / FAIL / BLOQUEADO / PARCIAL** al final.

---

## 0. Setup rápido

### 0.1 Acceso web
1. https://alianza-catalana.factoriaia.com en Chrome
2. Login con `test@ayuntamentia.cat` / `Test1234!`
3. Deberías ver el **Dashboard** (KPIs + mapa Catalunya + pipeline live)

### 0.2 Acceso al servidor (solo si se pide)
```bash
ssh root@85.215.105.45
cd /opt/ayuntamentia
docker compose ps                          # 6 contenedores Up
docker compose logs -f pipeline-worker     # ver pipeline en vivo
```

### 0.3 Crear usuarios de test adicionales
Admin → `/admin → Usuaris` → **Nuevo**. Para probar roles, crear al menos:
- 1 `delegado` con áreas=["medio_ambiente","pesca"]
- 1 `concejal` de un municipio concreto

---

# BLOQUE A — Peticiones explícitas del cliente

## A1. IA como chatbot de análisis ✨ (mejorado)

- 🎯 **Cliente**: "La IA debe funcionar como un chatbot de análisis que hable directamente y proporcione las conclusiones solicitadas, evitando la saturación de información."
- 📍 **Dónde**: `/chat`
- 🧪 **Pasos**:
  1. Login → menú lateral **Chat**
  2. Preguntar: *"¿Qué tendencias hay en medio ambiente este mes en Catalunya?"*
  3. Esperar respuesta (≤30 s)
  4. Otra: *"Compara votaciones de ERC y JxCat sobre urbanismo"*
  5. Genérica: *"Hola"*
- ✅ **Criterio**:
  - **[Nou v2]** Respuesta con **formato visual**: títulos destacados, bullets con viñeta azul, negritas, espaciado entre párrafos. Debe verse "hojable", no un muro de texto
  - Empieza con **veredicto de 1-2 frases**
  - Máx **3-5 bullets** con cifras concretas
  - Cierra con **"¿Y ahora qué?"** con 1-2 acciones
  - Bajo la respuesta, chips de **Fonts** con municipio+fecha
  - Idioma = idioma de la pregunta
  - "Hola" → saludo corto sin búsquedas
- ⚠️ **Estado**: ✅ formato markdown activo (classe `.markdown-body`)

---

## A2. Informes personalizados por temática ✨ (mejorado)

- 🎯 **Cliente**: "Informes automáticos por temáticas enviados en horario definido (ej. cada viernes)."
- 📍 **Dónde**: `/suscripciones`
- 🧪 **Pasos**:
  1. `/suscripciones` → **Nova subscripció**
  2. Nombre: `Brief setmanal medi ambient`
  3. Toggle **Temes predefinits** activado
  4. Chips: `medio_ambiente`, `pesca`, `agricultura`, `caza`
  5. Canal: `Email` (o `Tots dos`)
  6. **[Nou v2]** Finestra temporal: `Darrers 7 dies`
  7. **[Nou v2]** Quan s'enviarà: **Setmanal → Divendres → 08:00** (verás "Cada divendres a les 08:00 · `0 8 * * 5`" debajo)
  8. Botón **Crear**
  9. En la lista, botón **Previsualitza**
- ✅ **Criterio**:
  - **[Nou v2]** Al clicar Previsualitza, sale **modal con spinner** + *"Generant brief... Pot trigar 10-30 segons"*
  - Tras 10-30s, el modal muestra el brief **con formato markdown**: H2 para cada sección (**Titular / Moviments clau / Eco social / Riscos i oportunitats / Què vigilar**), bullets reales, negritas en municipios y cifras
  - **[Nou v2]** Si NO hay datos, cada sección tiene **UNA sola línea** "Sense activitat en aquest període" (no 3 placeholders)
  - Máx 350 palabras
- 🧪 **Forzar envío real** (solo si quieres validar email/telegram):
  ```bash
  ssh root@85.215.105.45 'cd /opt/ayuntamentia && \
    docker compose exec -T pipeline-worker celery -A src.workers.celery_app \
      call src.workers.tasks.dispatch_subscripciones'
  ```
- ⚠️ **Estado**: `subscripciones = 0` en prod — créala tú.

---

## A2-bis. Informes con consulta libre

- 🎯 **Cliente (implícito)**: *"Quiero saber qué se habla de Aliança Catalana"*, *"movimientos del PP"* — no encaja en chips.
- 📍 **Dónde**: `/suscripciones` → toggle **Consulta lliure**
- 🧪 **Pasos**:
  1. Nombre: `Vigilància AC`
  2. Toggle **Consulta lliure**
  3. Clicar un ejemplo (ej. *"Tot el que es parli d'Aliança Catalana a plens i a premsa"*) o escribir el propio
  4. Elegir Finestra temporal, Canal, Cron → **Crear**
  5. **Previsualitza**
- ✅ **Criterio**:
  - Brief interpreta la consulta y trae datos relevantes
  - Mismo formato markdown que A2
  - Si escribes <10 caracteres, botón Crear deshabilitado
- ⚠️ **Estado**: probar los 4 ejemplos sugeridos.

---

## A3. Recepción social integrada ✨ (rediseñado)

- 🎯 **Cliente**: "Que los informes incluyan acogida y feedback de la sociedad en redes sociales."
- 📍 **Dónde**: `/recepcio` + sección *Eco social* de cualquier brief
- 🧪 **Pasos**:
  1. `/recepcio`
  2. **[Nou v2]** Ver los **4 KPIs arriba**: Mencions / Sentiment net / Temes actius / Engagement
  3. **[Nou v2]** Ver el **grid de cards por tema** con barra tricolor (verde/gris/rojo) y contador grande
  4. **[Nou v2]** Click en una card → filtra el timeline por ese tema (card queda con borde azul)
  5. Cambiar finestra 7/14/30 con los botones tipo toggle
  6. Ver timeline de menciones con **dot de color** según sentiment + tag de tema
  7. Volver a `/suscripciones` → Previsualitzar un brief → buscar sección **Eco social**
- ✅ **Criterio**:
  - KPIs muestran números reales
  - Grid tiene al menos 1 card con datos
  - Click en card filtra timeline
  - **[Nou v2]** Si no hay datos, empty state amigable con icono (no pantalla vacía)
  - Timeline enlaza a URLs externas (prensa, Bluesky)
- ⚠️ **Estado**: solo 16 menciones en BD, solo fuente `ara`. Bluesky/otros RSS no aportan aún → verás pocos temas.

---

## A4. Anticipación proactiva (alertas) ✅ (resuelto)

- 🎯 **Cliente**: "Anticiparse a problemas/discursos antes de que sean públicos."
- 📍 **Dónde**: `/alertes`
- 🧪 **Pasos**:
  1. `/alertes` → ver listado
  2. **[Nou v2]** Verás alertas de 2 tipos: `tendencia_emergente` (3) + `incoherencia_interna` (10)
  3. Filtrar por tipo
  4. Click en una alerta → detalle con título, descripción, severidad
- ✅ **Criterio**:
  - **Ya hay 13 alertas** en BD (3 tendencias + 10 incoherencias)
  - Cada alerta muestra severidad (media) + descripción clara
  - Ejemplos que verás: *"Tema actiu: urbanismo (20 punts aquest mes)"*, *"Incoherència JxCat sobre medio_ambiente"*, *"Incoherència PSC sobre urbanismo"*
- 🧪 **Forzar regeneración** (opcional):
  ```bash
  ssh root@85.215.105.45 'cd /opt/ayuntamentia && \
    docker compose exec -T pipeline-worker python -c \
    "from src.coherencia.tendencias import detect_and_alert; print(detect_and_alert())"'
  ```
- ⚠️ **Estado**: ✅ resuelto en v2 (gap #3 del BLOQUE F eliminado).

---

## A5. Expansión al Parlament de Catalunya

- 🎯 **Cliente**: "Aplicar el sistema a sesiones, comisiones y plenos del Parlament."
- 📍 **Dónde**: `/parlament` + chat
- 🧪 **Pasos**:
  1. `/parlament` → listado iniciativas
  2. Chat: *"¿Qué iniciativas hay en el Parlament sobre vivienda?"*
  3. Chat: *"¿Qué contradicciones hay entre el PSC en Parlament y sus concejales?"*
- ✅ **Criterio**:
  - `/parlament` muestra iniciativas (21.125 en BD)
  - Chat invoca tool `iniciativas_parlament`
  - `/intel → Promeses incomplertes` tiene datos
- ⚠️ **Estado**: ✅ iniciativas; ❌ **`sesiones_parlament = 0`** (scraper DSPC no puebla). **PARCIAL**.

---

## A6. Énfasis en la capacidad de estudio (iceberg)

- 🎯 **Cliente**: "Potencia en la capa no visible — volumen masivo procesado."
- 📍 **Dónde**: Dashboard `/` + preguntas cross-fuente
- 🧪 **Pasos**:
  1. Dashboard `/` → KPIs
  2. Chat: *"¿Contradicen los socialistas en Girona lo que dicen en el Parlament sobre vivienda?"*
  3. Chat: *"Radiografía de Ripoll"* (cruza 5 tools)
- ✅ **Criterio**:
  - KPIs: ≥80k actas, ≥50k votos, ≥8k argumentos
  - Radiografía Ripoll devuelve respuesta de 5 fuentes distintas
- ⚠️ **Estado**: ✅

---

# BLOQUE B — Seguridad, privacidad y usuarios

## B1. Seguridad de acceso

- 🎯 "Evitar acceso externo."
- 🧪 **Pasos**:
  1. Incógnito sin login → intentar `https://alianza-catalana.factoriaia.com/chat`
  2. Call API sin JWT: `curl -i https://alianza-catalana.factoriaia.com/api/chat/`
- ✅ **Criterio**: redirect a `/login?next=/chat`; API 401; HTTPS certificado válido.

## B2. RGPD — ofuscación de nombres

- 🎯 "Ofuscar nombres de personas."
- 🧪 **Pasos**:
  1. Admin → `/admin → Usuaris` → editar delegado → checkbox **Anonimizar nombres** → guardar
  2. Incógnito, login con ese delegado
  3. Chat: *"¿Quién intervino en el último pleno de Girona?"*
- ✅ **Criterio**: particulares → iniciales (`J. G.`); cargos electos mantienen nombre completo.

## B3. Estructura de usuarios y roles

- 🎯 "Login con roles que vean solo su parte."
- 🧪 **Pasos**:
  1. Admin → crear `delegado_ma` (rol=delegado, áreas=["medio_ambiente","pesca"])
  2. Admin → crear `concejal_ripoll` (rol=concejal, municipios=[Ripoll])
  3. Login delegado_ma → `/buscar` → "urbanismo" (vacío/bloqueado), luego "medi ambient" (con resultados)
  4. Login concejal_ripoll → `/municipis` → solo Ripoll
- ✅ **Criterio**: scope respetado; admin ve todo.

## B4. Panel admin + audit log

- 🎯 "Monitorizar qué consulta cada delegado."
- 🧪 **Pasos**:
  1. `/admin` → pestaña **Resum** → contadores 30d
  2. Pestaña **Usuaris** → lista con rol, áreas, última actividad
  3. Pestaña **Audit log**
  4. Otra sesión: delegado hace 3 consultas
  5. Admin refresca audit log → las 3 con timestamp, mensaje, tools, latencia
- ✅ **Criterio**: cada `chat_query`, login, subscripció queda registrada; filtro por usuario OK.

---

# BLOQUE C — Otros funcionales

## C1. Monitor de votaciones

- 🧪 Chat: *"¿Cómo ha votado AC en los últimos plens?"*
- ✅ Lista con municipio+tema+sentido+fecha. BD tiene 51.345 votos clasificados.

## C2. Alertas de incoherencia ✅ (resuelto)

- 🧪 `/alertes` filtrado por `incoherencia_interna` — **verás 10 alertas ya generadas** (JxCat, PSC, ERC, VOX, CUP sobre diversos temas).
- ✅ Cada una referencia N municipios a favor + N en contra el mismo tema.

## C3. Mapa de discurso

- 🧪 Chat: *"¿Qué argumentos ha usado ERC sobre inmigración?"* + *"¿Qué dice [concejal X] en sus intervenciones?"*
- ✅ ≥5 intervenciones con concejal, municipio, fecha, posición.

## C4. Ranking interno de concejales

- 🧪 `/intel → Ranking concejales` → filtro partido=`AC`, orden=`divergencia` y luego `alineación`
- ✅ Tabla con concejal/municipio/partido/% alineación/nº votos. 33 filas en vista.

## C5. Informe semanal automático dirección

- 🧪 `/informes` → pestaña Setmanal → histórico. Forzar:
  ```bash
  ssh root@85.215.105.45 'cd /opt/ayuntamentia && \
    docker compose exec -T pipeline-worker celery -A src.workers.celery_app \
      call src.workers.tasks.weekly_report'
  ```
- ✅ Nueva entrada con fecha actual y contenido (titular+movimientos+eco+riesgos+vigilar).

## C6. Inteligencia competitiva

### C6.1 Qué aprueban rivales
- 🧪 Chat: *"¿Qué aprueba el PSC en municipios donde gobierna?"*
- ✅ Lista filtrada por partido proponente.

### C6.2 Contradicciones discurso nacional vs municipal
- 🧪 `/intel → Promeses incomplertes` + chat: *"¿Dónde defiende el PP una cosa en Parlament y la contraria en ayuntamientos?"*
- ⚠️ **Estado**: `v_contradicciones_rival = 0` (depende de `sesiones_parlament`). PARCIAL.

### C6.3 Qué propuestas prosperan
- 🧪 Chat: *"¿Qué propuestas de vivienda han prosperado y cuáles se han rechazado?"*
- ✅ Separa aprobadas/rechazadas con cifras.

## C7. Conocer el territorio

- 🧪 `/municipis` → municipio → radiografía. `/intel → Tendències emergents`. Chat: *"¿Qué preocupa más en Manlleu?"*
- ✅ Página con composición pleno, alcaldes, elecciones, presupuestos, plens, temas.

## C8. Preparar concejales

- **C8.1** — Chat: *"¿Qué argumentos usa Junts contra las ordenanzas de civismo?"* ✅ intervenciones en contra.
- **C8.2** — Chat: *"¿Qué mociones ha ganado AC este año?"* ✅ puntos aprobados propios AC.
- **C8.3** — `/intel → Ranking concejales` partido=AC orden=divergencia ✅ top 5 más divergentes.

## C9. Comunicación y medios

- **C9.1** — Chat: *"Dame 3 casos concretos esta semana en medio ambiente para una nota de prensa"* → 3 hechos con municipio+fecha+cifra+fuente.
- **C9.2** — `/intel → Promeses incomplertes` → listado con links.
- **C9.3** — En `/chat`, tras respuesta con datos, usar **GeneradorRRSS**:
  - Tweet ≤260 chars con hashtags
  - LinkedIn: hook+bullets+tesis+pregunta
  - Telegram: título negrita+3 bullets emoji+CTA
  - Localizado: *"En el teu municipi votaren X, en el veí Y…"*

## C10. Rendición de cuentas

- **C10.1** — Chat: *"Lista todo lo aprobado por AC este trimestre en Catalunya"* → agregado por municipio.
- **C10.2** — `/suscripciones` → **Consulta lliure** → *"Resumen de gestió AC a [municipio]"* + cron mensual → previsualitza.
  - ⚠️ No hay botón "auto-gestión" dedicado en `/informes` (roadmap).

---

# BLOQUE D — Script de humo

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
c.execute("select tipo,count(*) from alertas group by 1"); print("  alertas tipo:",c.fetchall())
for v in ["v_ranking_concejales","v_tendencias_emergentes","v_contradicciones_rival"]:
    c.execute(f"select count(*) from {v}"); print(f"  {v:30s} {c.fetchone()[0]}")
PY

echo "=== [3] regenerar alertas ==="
docker compose exec -T pipeline-worker python -c "from src.coherencia.tendencias import detect_and_alert; print(detect_and_alert())"

echo "=== [4] forzar crons ==="
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.dispatch_subscripciones
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.weekly_report

echo "=== [5] HTTPS ==="
curl -sk -o /dev/null -w "  login %{http_code}\n" https://alianza-catalana.factoriaia.com/login
curl -sk -o /dev/null -w "  chat  %{http_code}\n" https://alianza-catalana.factoriaia.com/chat
curl -sk -o /dev/null -w "  api   %{http_code}\n" https://alianza-catalana.factoriaia.com/api/health
REMOTE
```

---

# BLOQUE E — Tabla de reporte

Copiar a Google Sheet. Resultado = `PASS / FAIL / BLOQUEADO / PARCIAL`.

| Ref | Título | Resultado v1 | Resultado v2 | Captura | Observación |
|---|---|---|---|---|---|
| A1 | Chatbot análisis + formato markdown | — | | | |
| A2 | Informes por temática + cron amigable + loader + ventana | — | | | |
| A2-bis | Consulta libre | — | | | |
| A3 | Recepción social rediseñada | — | | | |
| A4 | Alertas proactivas (resuelto) | — | | | |
| A5 | Parlament Catalunya | — | | | |
| A6 | Iceberg / estudio | — | | | |
| B1 | Seguridad acceso | — | | | |
| B2 | RGPD ofuscación | — | | | |
| B3 | Roles y scope | — | | | |
| B4 | Audit log admin | — | | | |
| C1 | Monitor votaciones | — | | | |
| C2 | Alertas incoherencia (resuelto) | — | | | |
| C3 | Mapa de discurso | — | | | |
| C4 | Ranking concejales | — | | | |
| C5 | Informe semanal dirección | — | | | |
| C6.1 | Qué aprueban rivales | — | | | |
| C6.2 | Contradicciones rivales | — | | | |
| C6.3 | Qué propuestas prosperan | — | | | |
| C7 | Conocer territorio | — | | | |
| C8.1 | Argumentos oposición | — | | | |
| C8.2 | Buenas prácticas propias | — | | | |
| C8.3 | Divergentes propios | — | | | |
| C9.1 | Titulares prensa | — | | | |
| C9.2 | Promesas incumplidas | — | | | |
| C9.3 | RRSS localizado | — | | | |
| C10.1 | Gestión AC agregada | — | | | |
| C10.2 | Gestión por municipio | — | | | |

---

# BLOQUE F — Gaps conocidos actualizados

| # | Gap | v1 | v2 | Tests afectados |
|---|---|---|---|---|
| 1 | `sesiones_parlament = 0` (scraper DSPC caído) | ⚠️ | ⚠️ | A5, C6.2 |
| 2 | Solo 16 menciones sociales, solo fuente `ara` | ⚠️ | ⚠️ | A3, A4 (`reaccion_social`) |
| 3 | `alertas = 0` | ⚠️ | ✅ **RESUELTO** (13 alertas generadas) | A4, C2 |
| 4 | `presupuestos = 0` — dataset no cargado | ⚠️ | ⚠️ | C7 |
| 5 | Solo 1 usuario real en BD | ⚠️ | ⚠️ | B3 (crearlos durante test) |
| 6 | No hay botón "gestión auto" en `/informes` | ⚠️ | ⚠️ (workaround: consulta libre) | C10.2 |

Si reproduces un gap, pon *"reproduce gap #N de BLOQUE F"* en la observación.

---

# BLOQUE G — Feedback v1 que ya está arreglado (re-verificar)

Estos puntos del test anterior tienen que cerrarse **PASS** esta ronda:

1. ✅ **Chat respuestas sin formato** → ahora markdown con títulos, bullets, negrita, espaciado
2. ✅ **Cron en crudo** → selector amigable con frase humana
3. ✅ **Previsualitza sin loader** → modal con spinner + mensaje explicativo
4. ✅ **Modal brief sin formato** → render markdown con H2 por sección
5. ✅ **"Moviments clau" con 3× sense activitat** → línea única si no hay datos
6. ✅ **Ventana temporal no seleccionable** → dropdown 7/14/30/90 días
7. ✅ **`/recepcio` UI pobre** → KPIs + grid clicable + timeline con dots
8. ✅ **`/alertes` vacío** → 13 alertas ya en BD

Verifica **específicamente** estos 8 puntos y marca diferencia vs v1.

---

# BLOQUE H — Contacto

- Dudas producto / técnicas: Juan Manuel
- Servidor: `root@85.215.105.45`
- Reset credenciales: `./scripts/create_admin.sh` en el VPS
