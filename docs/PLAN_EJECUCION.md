# Plan de Ejecución AyuntamentIA — Día a día

Estimación total: **22 días laborables** (~4,5 semanas con 1 dev full-time).

Leyenda: 🔒 bloqueante · 🚀 valor cliente alto · 🧪 requiere validación cliente · ⚙️ infra

---

## 🟢 FASE 1 — Seguridad, RBAC y Audit (4 días) 🔒

**Objetivo**: Plataforma cerrada con login, roles, scopes y trazabilidad completa.

### Día 1 — Backend auth (✅ HECHO en esta sesión)
- [x] Migration `003_auth_rbac.sql` (user_profiles, user_areas, user_municipios, usage_log, subscripciones, mencion_social, vistas ranking + tendencias)
- [x] `api/src/auth.py` — verificación JWT Supabase, dependency `get_current_user`, `require_admin`, `log_usage`
- [x] `api/src/routes/admin.py` — CRUD usuarios, asignación áreas/municipios, audit log, summary
- [x] Audit log en `chat.py` (con latencia + tools usadas)
- [x] `ANSWER_PROMPT` reescrito a "modo análisis directo" (veredicto + 3-5 puntos + accionable)

### Día 2 — Web auth (Next.js 16)
- [ ] Instalar `@supabase/supabase-js` y `@supabase/ssr`
- [ ] `web/src/lib/supabaseClient.ts` (browser) y `supabaseServer.ts` (server)
- [ ] Page `/login` con magic link
- [ ] `middleware.ts` que redirige a `/login` si no hay sesión
- [ ] Adaptar `ApiClient.ts` para enviar `Authorization: Bearer <jwt>`
- [ ] Layout: header con email + botón logout

### Día 3 — Panel admin
- [ ] Page `/admin` (solo rol=admin) con tabs: Usuarios, Audit, Suscripciones
- [ ] Tabla usuarios + modal editar (rol, áreas, municipios)
- [ ] Vista timeline de uso (filtros user, acción, fecha)
- [ ] Métricas: queries/día, usuarios activos, top temas consultados

### Día 4 — RGPD + scoping efectivo
- [ ] Aplicar scoping en routes que devuelven datos personales (votaciones individuales)
- [ ] Toggle "anonimizar nombres particulares" → reemplaza `cargos_electos.nombre` por iniciales si rol=concejal
- [ ] Texto legal `/legal/privacidad`, `/legal/uso`
- [ ] Audit log de exports (CSV/PDF)
- [ ] Crear usuario admin inicial via SQL seed (o script CLI)
- [ ] **Validación cliente** 🧪: probar login + asignación delegado

---

## 🟢 FASE 2 — Informes temáticos personalizados (3 días) 🚀

**Objetivo**: Cada usuario recibe un brief en su email/Telegram cada viernes, con sus temas.

### Día 5 — Modelo + job
- [ ] Tabla `subscripciones` ya creada en Fase 1
- [ ] Page `/suscripciones` (CRUD usuario): nombre, temas multi-select, municipios, canal, día/hora
- [ ] Endpoint `POST /api/subscripciones`
- [ ] Job Celery `generate_thematic_brief(subscripcion_id)` — query datos del rango temporal + filtro temas/municipios

### Día 6 — Generación brief
- [ ] Nuevo prompt `THEMATIC_BRIEF_PROMPT` (estructura: titular, qué pasó, dónde, riesgos, oportunidades)
- [ ] Plantilla email HTML + texto plano (Resend o SMTP local)
- [ ] Envío Telegram con formato Markdown (límite 4096 chars → split)
- [ ] Setup variables: `RESEND_API_KEY` o credenciales SMTP

### Día 7 — Scheduling + observabilidad
- [ ] Beat scheduler dinámico que lee `subscripciones.cron_expr` cada minuto
- [ ] Marcar `last_sent_at`, evitar duplicados
- [ ] Dry-run mode + endpoint `POST /api/subscripciones/{id}/preview`
- [ ] Test E2E con suscripción real
- [ ] **Validación cliente** 🧪: registrar 2 temas, confirmar email viernes

---

## 🟢 FASE 3 — Recepción social (5 días) 🚀

**Objetivo**: Cruzar lo que se debate en plenos con lo que se habla en redes/prensa.

### Día 8 — Ingesta sources
- [ ] Bluesky firehose (gratis, sin auth) — keywords AC, plenos, partidos, temas
- [ ] Mastodon hashtags catalanes (#politicacat, etc.)
- [ ] RSS prensa local (Vilaweb, NacióDigital, El Punt Avui, ElNacional.cat, ARA)
- [ ] Twitter/X — opcional vía scraping ligero o saltarse si API muy cara
- [ ] Worker `ingesta_social.py` con dedupe por `(fuente, fuente_url)`

### Día 9 — Clasificación
- [ ] LLM clasifica: tema (ontología compartida con `puntos_pleno.tema`) + municipio inferido + sentiment
- [ ] Rate-limit 30/min (cuidado OpenClaw)
- [ ] Llenar `mencion_social` con `tema`, `municipio_id`, `sentiment`, `engagement`

### Día 10 — Cruce con plenos
- [ ] Vista `v_pleno_x_recepcion`: para cada `puntos_pleno` reciente, conteo de menciones en ventana ±7d por sentiment
- [ ] Tool nuevo `recepcion_social(tema, municipio?, dias?)` para chat
- [ ] Sección "Eco social" en página `/actas/[id]` y `/municipios/[id]`

### Día 11 — Alertas sociales
- [ ] Detector `alertas tipo='reaccion_social'`: pleno con sentiment muy negativo (>50% negativos en >20 menciones)
- [ ] Incluir en informes temáticos y panel `/alertas`
- [ ] **Validación cliente** 🧪: ver 1 caso real cruzado

### Día 12 — UI Recepción social dedicada
- [ ] Page `/recepcion` con filtros tema/fecha/sentiment
- [ ] Wordcloud + timeline de menciones por tema
- [ ] Top influencers por tema

---

## 🟢 FASE 4 — Anticipación proactiva (3 días) 🚀

**Objetivo**: Detectar discursos emergentes ANTES de que escalen a plenos masivos.

### Día 13 — Detector tendencias
- [ ] Vista `v_tendencias_emergentes` (✅ creada)
- [ ] Job semanal `detect_emerging_topics`: combina crecimiento en plenos + crecimiento en `mencion_social`
- [ ] Score = `(delta_plenos × 0.4 + delta_social × 0.6) × scale`

### Día 14 — Geo-difusión
- [ ] Detectar tema iniciado en N municipios pequeños → predecir comarcal/nacional
- [ ] Vista `v_temas_por_comarca` con histórico
- [ ] Generar alerta `tipo='tendencia_geo'` cuando un tema salta de 1 comarca a 3+ en <30d

### Día 15 — Brief proactivo
- [ ] Endpoint `GET /api/intel/anticipacion` que devuelve top 10 tendencias emergentes con contexto
- [ ] LLM redacta narrativa: "tema X creciendo, primera aparición en Y, ahora en Z, recepción social Q"
- [ ] Integrar en informe semanal de dirección
- [ ] **Validación cliente** 🧪

---

## 🟢 FASE 5 — Parlament de Catalunya (5 días) 🚀

**Objetivo**: Misma inteligencia aplicada al Parlament: plenos, comisiones, DSPC, grabaciones.

### Día 16 — Catálogo Parlament
- [ ] Scraper `parlament.cat` → catálogo iniciativas (✅ ya parcial), DSPC (Diari de Sessions) PDFs, comisiones
- [ ] Tabla `sesiones_parlament` análoga a `actas` (mismo pipeline status)
- [ ] Reusar tabla `puntos_pleno` con campo `nivel ENUM('municipal','parlament')`

### Día 17 — Pipeline DSPC
- [ ] Descarga PDF DSPC, extracción texto, mismo flow
- [ ] Mapeo grupos parlamentarios → tabla `partidos_norm`
- [ ] Estructuración LLM con prompt adaptado

### Día 18 — Grabaciones
- [ ] Detectar URL vídeo en sesiones recientes
- [ ] Whisper local (ya en OpenClaw o `faster-whisper` standalone)
- [ ] Transcripción → mismo pipeline que DSPC (cuando no hay PDF aún)
- [ ] Sólo activar si cliente lo pide explícitamente (coste compute alto)

### Día 19 — UI Parlament
- [ ] Page `/parlament` con últimas sesiones, comisiones activas
- [ ] Tools chat: `buscar_parlament(query)`, `sesion_parlament(fecha)`
- [ ] Cruce automático: "tema X en Parlament + en N municipios"

### Día 20 — Inteligencia competitiva avanzada
- [ ] Page `/inteligencia/[partido]` con vista 360º del rival
- [ ] Cross-check discurso nacional Parlament vs voto municipal
- [ ] Detector contradicciones: "PSC defiende X en Parlament pero vota ¬X en M municipios"
- [ ] **Validación cliente** 🧪 — caso real

---

## 🟡 FASE 6 — Pulido y delivery (2 días) ⚙️

### Día 21 — UX y performance
- [ ] Refinar `GeneradorRRSS` con templates por tema y tono
- [ ] Cache Redis en endpoints pesados (`/api/dashboard`, `/api/admin/usage/summary`)
- [ ] Ajuste rates OpenClaw según monitorización 30 días
- [ ] Lighthouse + accesibilidad básica

### Día 22 — Documentación + handoff
- [ ] Manual usuario (web + telegram)
- [ ] Manual admin (gestión usuarios, RGPD, troubleshooting)
- [ ] Runbook ops (qué hacer si pipeline falla, cómo restartear, dónde mirar logs)
- [ ] Vídeo demo 5 min para roadshow Aliança Catalana

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cuota OpenClaw saturada por carga social | Media | Back-off exponencial ya implementado; rate limit por tipo de task |
| Twitter/X API muy cara o cerrada | Alta | Skipear, priorizar Bluesky + RSS prensa |
| Whisper transcripción muy lenta | Media | Diferir Fase 5 día 18 a sprint posterior |
| Cliente cambia prioridades | Alta | Cada fase es independiente y entregable |
| Coste LLM se dispara | Media | Usar `mini` para clasificación, `full` solo para briefs |

---

## Hitos de validación con cliente

- **Día 4**: Login + delegados (Fase 1) → demo cerrada
- **Día 7**: Primer email viernes con tema configurado → wow-moment
- **Día 11**: Cruce pleno↔reacción social → diferenciador competitivo
- **Día 15**: Anticipación proactiva → "esto no lo tiene nadie"
- **Día 20**: Vista rival 360º → herramienta de campaña
- **Día 22**: Entrega final + formación

---

## Estado de la sesión actual (Día 1)

✅ Migration auth/RBAC/audit/subscripciones/social/vistas
✅ Auth backend FastAPI con JWT Supabase
✅ Endpoints admin (CRUD users, audit, summary, /me)
✅ Audit log integrado en chat
✅ Prompt chat reescrito a modo análisis directo
✅ Plan ejecución día a día (este documento)

⏭️ Próximo: aplicar migration en servidor + crear primer admin + Día 2 (web auth)
