# AyuntamentIA — Validación funcional vs requerimientos del cliente

**Fecha**: 2026-04-14
**Entorno auditado**: Producción `85.215.105.45` (`/opt/ayuntamentia`)
**URL pública**: https://alianza-catalana.factoriaia.com (HTTPS 200, API 200)
**Último commit desplegado**: `c91c4f9` — RGPD ofuscación + UI intel + bugs menores + templates RRSS
**Branch**: main (sincronizado con dev local)

---

## 0. Resumen ejecutivo

| Bloque | Estado | Nota |
|---|---|---|
| Chatbot de análisis | ✅ Producción | 16 tools, prompt modo análisis |
| Informes temáticos por email/Telegram | ✅ Producción | 0 suscripciones creadas aún (sin datos reales para validar envío) |
| Recepción social integrada | 🟡 Parcial | Pipeline activo pero solo 16 menciones (solo fuente `ara`) — falta afinar keywords Bluesky/RSS |
| Anticipación proactiva (alertas) | 🟡 Parcial | Detector implementado y corriendo cada 4h, **0 alertas generadas** por falta de volumen social y concentración temática |
| Parlament de Catalunya | 🟡 Parcial | Tabla creada, 21.125 iniciativas ingestadas, **0 sesiones DSPC descubiertas aún** (tarea `discover-parlament` diaria, revisar) |
| Capacidad de estudio (iceberg) | ✅ Producción | 82.352 actas descubiertas, 68.623 puntos estructurados, 51.345 votaciones, 8.405 argumentos |
| Seguridad / acceso | ✅ Producción | Supabase Auth + JWT middleware + HTTPS |
| RGPD ofuscación nombres | ✅ Producción | Flag por usuario, cargos electos exentos |
| Roles y scope | ✅ Producción | admin/direccion/delegado/concejal + áreas + municipios |
| Panel admin con audit log | ✅ Producción | `usage_log` con 1 registro (solo hay 1 usuario real) |
| Monitor votaciones | ✅ Producción | 51.345 votos registrados y clasificados |
| Alertas de incoherencia | ✅ Código listo | 0 generadas — revisar detector cuando AC tenga más concejales cruzados |
| Mapa de discurso | ✅ Producción | 8.405 argumentos extraídos |
| Ranking interno | ✅ Producción | Vista `v_ranking_concejales` devuelve 33 filas |
| Informe semanal dirección | ✅ Código | Cron lunes 8am — validar primera ejecución real |
| Inteligencia competitiva | ✅ Producción | Tools + vista `v_contradicciones_rival` (0 hits aún) |
| Conocer territorio | ✅ Producción | 9 tendencias detectadas, 947 municipios, 36.016 registros población |
| Preparar concejales | ✅ Producción | Ranking + argumentos + votaciones AC |
| Comunicación (RRSS) | ✅ Producción | 4 templates en el chat |
| Rendición de cuentas | 🟡 Código | Template "gestión propia" pendiente en `/informes` |

---

## 1. Infraestructura verificada

```
docker compose ps (2026-04-14 08:05 UTC)
  ayuntamentia-api-1              Up 18h  (FastAPI)
  ayuntamentia-web-1              Up 18h  (Next.js → 3100)
  ayuntamentia-pipeline-beat-1    Up 19h  (Celery beat)
  ayuntamentia-pipeline-worker-1  Up 19h  (Celery worker)
  ayuntamentia-telegram-1         Up 19h  (@alianza_catalana_bot)
  ayuntamentia-redis-1            Up 5d
```

Beat disparando: `process-backfill-batch` (30s), `dispatch-subscripciones` (60s), `classify-social-batch` (90s), `process-parlament-batch` (2min), `ingest-social` (15min). Worker estructurando actas en vivo (10-27 puntos/acta vía OpenClaw).

---

## 2. Datos reales en BD (Supabase)

| Tabla | Filas | Comentario |
|---|---|---|
| `municipios` | 947 | ✅ Catalunya completa |
| `cargos_electos` | 26.586 | ✅ Municat |
| `actas` | 82.352 | ✅ Catálogo CKAN |
| `actas` status `structured` | 9.960 | 🟡 12% procesado, backfill continúa |
| `actas` status `discovered` | 69.057 | Pendientes de descarga |
| `actas` status `failed_*` | 289 | <0,4% — aceptable |
| `actas_analisis` | 9.983 | ✅ |
| `puntos_pleno` | 68.623 | ✅ |
| `votaciones` | 51.345 | ✅ |
| `argumentos` | 8.405 | ✅ |
| `alertas` | **0** | ⚠️ Detector corre pero sin hits |
| `mencion_social` | **16** (solo `ara`) | ⚠️ Bluesky + otros RSS no aportando |
| `sesiones_parlament` | **0** | ⚠️ Discovery diario no puebla |
| `iniciativas_parlament` | 21.125 | ✅ |
| `elecciones` | 33.184 | ✅ |
| `alcaldes` | 11.873 | ✅ Desde 1979 |
| `mociones` | 1.249 | ✅ |
| `poblacion` | 36.016 | ✅ |
| `presupuestos` | **0** | ⚠️ Dataset no cargado |
| `user_profiles` | 1 admin | Falta crear usuarios reales |
| `subscripciones` | 0 | Sin suscripciones de prueba |
| `usage_log` | 1 | |

**Vistas analíticas**: `v_ranking_concejales` (33), `v_tendencias_emergentes` (9), `v_contradicciones_rival` (0).

---

## 3. Checklist funcional del cliente — cómo validar cada punto

> Para cada punto: **ESTADO**, **DÓNDE mirarlo**, **CÓMO probarlo**, **CRITERIO de éxito**.

### 3.1 IA como chatbot de análisis (no saturación)

- **ESTADO**: ✅ Producción
- **Dónde**: https://alianza-catalana.factoriaia.com/chat
- **Cómo**: login como admin → preguntar "¿Qué tendencias hay en medio ambiente este mes?"
- **Criterio**: respuesta empieza con veredicto de 1-2 frases, máximo 3-5 bullets con cifras concretas, cierra con sección **"¿Y ahora qué?"** con acciones. Cita municipio+fecha.
- **Código ref**: `api/src/routes/chat.py` (prompt); 16 tools listadas en §6 de `ESPECIFICACION_FUNCIONAL.md`.

### 3.2 Informes personalizados por temática (viernes 8h, etc.)

- **ESTADO**: ✅ Código en producción / 🟡 Sin suscripciones reales creadas
- **Dónde**: `/suscripcions`
- **Cómo probar**:
  1. Login → `/suscripcions` → "Nueva suscripción"
  2. Elegir temas (medi ambient, comerç, pesca, agricultura, caça), canal email + Telegram, cron `0 8 * * 5`
  3. Botón **"Previsualitzar (dry-run)"** → debe devolver brief sin enviar
  4. Guardar → vincular Telegram con código (ver 3.3)
  5. Esperar viernes 8h **o** forzar: `docker compose exec pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.dispatch_subscripciones`
- **Criterio**: email llega vía Resend + mensaje Telegram al chat vinculado con formato ejecutivo (titular + moviments clau + eco social + riscos + vigilar).
- **Pendiente**: crear las ~5-10 suscripciones reales de la dirección del partido.

### 3.3 Vinculación Telegram

- **ESTADO**: ✅ Producción
- **Cómo**: `/suscripcions` → "Vincular Telegram" genera código → abrir `t.me/alianza_catalana_bot?start=vincular_CODIGO`
- **Criterio**: bot responde confirmando vinculación; registro en `telegram_link_codes` consumido.

### 3.4 Recepción social integrada en informes

- **ESTADO**: 🟡 Parcial
- **Dónde**: `/recepcio` + sección "Eco social" del brief
- **Problema detectado**: solo 16 menciones, únicamente fuente `ara`. Bluesky y resto de RSS no están produciendo.
- **Validar**: `docker compose logs pipeline-worker | grep -E "ingest_social|social"` → buscar errores de auth Bluesky o keywords vacías.
- **Acción**: revisar credenciales `BLUESKY_*` en `.env` y keywords de `ingest-social` task.

### 3.5 Anticipación proactiva (alertas)

- **ESTADO**: 🟡 Código listo, **0 alertas generadas**
- **Dónde**: `/alertes`
- **Causa probable**: umbrales estrictos + poco volumen social + AC tiene pocos concejales cruzados todavía
- **Validar**:
  ```sql
  select tipo, severidad, descripcion from alertas order by created_at desc limit 20;
  ```
- **Forzar ejecución**: `docker compose exec pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.detect_emerging`
- **Acción**: bajar umbrales temporalmente (ej. tendencia_emergente de +5 a +2 puntos) para comprobar que el detector escribe correctamente.

### 3.6 Expansión Parlament de Catalunya

- **ESTADO**: 🟡 Parcial
  - ✅ 21.125 iniciativas parlamentarias indexadas
  - ✅ Tool `iniciativas_parlament(query)` en chat
  - ✅ UI `/parlament`
  - ⚠️ **0 sesiones DSPC descubiertas**. Task `discover-parlament` corre diaria 2am pero la tabla `sesiones_parlament` está vacía.
- **Validar**: `docker compose logs pipeline-worker 2>&1 | grep -i parlament | tail -50`
- **Acción**: revisar scraper DSPC (puede haber cambiado HTML de `parlament.cat`).

### 3.7 Capacidad de estudio (iceberg)

- **ESTADO**: ✅
- **Cómo demostrarlo al cliente**:
  - Dashboard `/` → KPIs: 82.352 actes, 68.623 punts, 51.345 votacions, 8.405 arguments
  - Hacer pregunta abstracta al chat que requiera cruzar fuentes: "¿Contradicen los socialistas en Girona lo que dicen en Parlament sobre vivienda?" → tool `comparar_partidos` + `v_contradicciones_rival`
- **Criterio**: respuesta integra ≥2 fuentes (municipal + Parlament) con cifras.

### 3.8 Seguridad de acceso

- **ESTADO**: ✅
- **Validar**:
  - HTTPS con certificado válido (Let's Encrypt nginx)
  - `curl -i https://alianza-catalana.factoriaia.com/chat` sin login → redirect a `/login`
  - Middleware `web/src/proxy.ts` + `api/src/auth.py` validan JWT Supabase en cada request

### 3.9 RGPD — ofuscación de nombres

- **ESTADO**: ✅
- **Cómo probar**:
  1. Admin UI `/admin → Usuarios → editar delegado → activar "anonimizar nombres"`
  2. Loguearse como ese delegado
  3. Pedir al chat: "¿Quién intervino en el pleno de X?"
- **Criterio**: asistentes particulares aparecen como "J. G."; alcaldes/regidores (cargos electos) mantienen nombre completo.
- **Código**: `api/src/anonymize.py`

### 3.10 Estructura de usuarios y roles

- **ESTADO**: ✅
- **Roles**: `admin`, `direccion`, `delegado`, `concejal`
- **Scope**: `user_areas` (temas) y `user_municipios`
- **Validar**: `/admin → Usuaris`, crear delegado con áreas=["medi ambient","pesca"] y comprobar que en `/buscar` solo ve puntos de esas áreas.
- **Script**: `./scripts/create_admin.sh` (y luego editar rol).

### 3.11 Panel admin con trazabilidad

- **ESTADO**: ✅
- **Dónde**: `/admin → Audit log`
- **Cómo probar**: abrir dos sesiones (admin + delegado) → el delegado hace consultas → en audit log del admin aparecen todas (acción, timestamp, payload).
- **Tabla**: `usage_log`. Cada endpoint API escribe.

### 3.12 Monitor de votaciones

- **ESTADO**: ✅ 51.345 registrados
- **Validar**:
  ```sql
  select partido, sentido, count(*) from votaciones
  group by 1,2 order by 1, 3 desc limit 30;
  ```

### 3.13 Alertas de incoherencia

- **ESTADO**: ✅ Código / **0 generadas** (ver 3.5)
- **Validar**: ejecutar detector y consultar `alertas where tipo='incoherencia_interna'`.

### 3.14 Mapa de discurso

- **ESTADO**: ✅ 8.405 argumentos
- **Validar en chat**: "¿Qué ha dicho [partido X] sobre inmigración en los últimos 3 meses?" → usa `buscar_argumentos`.

### 3.15 Ranking interno de concejales

- **ESTADO**: ✅
- **Dónde**: `/intel → Ranking concejales`
- **Validar**: `select * from v_ranking_concejales where partido='AC' order by alineacion asc limit 10;` → 10 concejales más divergentes.

### 3.16 Informe semanal automático dirección

- **ESTADO**: ✅ Código; primera entrega real pendiente
- **Cron**: `weekly-report` lunes 8:00
- **Validar**: el próximo lunes verificar que llega email + mensaje Telegram a la dirección; mientras tanto forzar con `celery ... call src.workers.tasks.weekly_report`.

### 3.17 Inteligencia competitiva

- **Subpunto A — votos rivales**: ✅ tool `buscar_votaciones(partido)` + `comparar_partidos`
- **Subpunto B — contradicciones nacional vs municipal**: ✅ vista `v_contradicciones_rival` + `/intel → Promeses incomplertes` (0 hits aún; depende de volumen Parlament que está a 0)
- **Subpunto C — qué propuestas prosperan**: ✅ `puntos_pleno.resultado` + tool `buscar_por_tema`
- **Validar**: en chat "¿Qué propuestas de vivienda del PSC han sido rechazadas en municipios gobernados por Junts?" → respuesta con cifras.

### 3.18 Conocer el territorio

- ✅ Tool `info_municipio` + `buscar_por_tema`
- ✅ Alerta `tendencia_geo` (1 → 3+ comarcas en 30d)
- **Validar**: `/intel → Tendències emergents` muestra 9 temas activos

### 3.19 Preparar concejales

- ✅ Ranking divergentes AC + argumentos oposición
- **Validar**: chat "Dame los 3 argumentos más usados por ERC contra las ordenanzas de civismo"

### 3.20 Comunicación y medios

- ✅ Componente **GeneradorRRSS** en `/chat`
- **Cómo probar**: tras respuesta del chat, botón "Generar Tweet/LinkedIn/Telegram/Localizado"
- **Criterio**: tweet ≤260 chars; post LinkedIn con hook+bullets+tesis+pregunta; mensaje Telegram con emoji; versión "en tu municipi votaren X".

### 3.21 Rendición de cuentas

- ✅ Si AC gobierna: suscripción temática "Gestió AC" con `partido=AC`
- 🟡 **Pendiente**: botones de auto-generación de informe de gestión por municipio en `/informes` (roadmap §18.2)

---

## 4. Gaps detectados en esta auditoría (priorizados)

| # | Gap | Impacto | Acción propuesta |
|---|---|---|---|
| 1 | `sesiones_parlament` = 0 | Rompe promesa §3.6 al cliente | Revisar scraper DSPC (puede haber cambiado HTML parlament.cat) |
| 2 | Solo 16 menciones sociales, solo `ara` | Recepción social débil | Revisar credenciales Bluesky + keywords + logs task `ingest_social` |
| 3 | 0 alertas generadas | Anticipación proactiva no demostrable | Bajar umbrales detector temporalmente + revisar query `tendencia_emergente` |
| 4 | `presupuestos` vacío | Tool `presupuesto_municipio` devuelve vacío | Cargar dataset Generalitat (script existe?) |
| 5 | 1 solo usuario (admin) | No se ha probado scope real | Crear 3-4 delegados reales con áreas distintas |
| 6 | Template "gestión propia" en `/informes` | Rendición de cuentas menos automática | Roadmap §18.2 |
| 7 | Sin vídeo demo 5 min | Roadshow | Roadmap §18.5 |

---

## 5. Script de validación end-to-end (suite de humo)

```bash
ssh root@85.215.105.45 'cd /opt/ayuntamentia && bash' <<'EOF'
echo "=== containers ==="
docker compose ps --format "table {{.Service}}\t{{.Status}}"

echo "=== counts ==="
docker compose exec -T api python <<PY
import psycopg2,os
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.autocommit=True; c=conn.cursor()
for t in ["municipios","actas","puntos_pleno","votaciones","argumentos","alertas",
         "mencion_social","sesiones_parlament","iniciativas_parlament",
         "user_profiles","subscripciones","usage_log"]:
    c.execute(f"select count(*) from {t}"); print(f"{t:25s} {c.fetchone()[0]}")
c.execute("select status,count(*) from actas group by 1"); print("status:",c.fetchall())
PY

echo "=== forzar crons clave ==="
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.detect_emerging
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.weekly_report
docker compose exec -T pipeline-worker celery -A src.workers.celery_app call src.workers.tasks.dispatch_subscripciones

echo "=== HTTPS ==="
curl -sk -o /dev/null -w "login %{http_code}\n" https://alianza-catalana.factoriaia.com/login
curl -sk -o /dev/null -w "api   %{http_code}\n" https://alianza-catalana.factoriaia.com/api/health
EOF
```

---

## 6. Checklist de aceptación cliente (marcar en demo)

- [ ] Login admin + cambio de rol a delegado → ver restricciones
- [ ] Chat responde con formato análisis (veredicto + bullets + ¿Y ahora qué?)
- [ ] Crear suscripción viernes 8h + dry-run brief → comprobar email + Telegram
- [ ] Vincular Telegram personal vía deep link
- [ ] Activar ofuscación RGPD en un delegado → verificar que los nombres particulares aparecen iniciales
- [ ] Audit log en `/admin` muestra las consultas del delegado
- [ ] Ranking concejales AC ordenado por divergencia
- [ ] Generar Tweet/LinkedIn desde chat
- [ ] Forzar `detect_emerging` → al menos 1 alerta visible en `/alertes` (requiere ajuste de umbrales)
- [ ] Forzar `weekly_report` → brief semanal llega
- [ ] **Gap Parlament**: comprobar `sesiones_parlament` con datos (tras fix scraper)
- [ ] **Gap Social**: Bluesky + RSS extra aportando menciones
