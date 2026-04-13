# AyuntamentIA — Especificación funcional

**Cliente**: Aliança Catalana
**URL producción**: https://alianza-catalana.factoriaia.com
**Bot Telegram**: @alianza_catalana_bot
**Cobertura**: 947 municipis de Catalunya + Parlament de Catalunya + premsa + Bluesky

---

## 1. Visión

Plataforma d'intel·ligència política que recull actes de plens municipals, debats del Parlament i eco a xarxes/premsa, i els transforma en conclusions accionables per la direcció del partit i els seus delegats.

El valor resideix en la **capa no visible** (iceberg): volum massiu de dades processades, relacionades i interpretables via chatbot i briefs temàtics personalitzats.

---

## 2. Autenticació, rols i seguretat

### Login
- Supabase Auth amb email+password i magic link
- Middleware `proxy.ts` protegeix totes les rutes excepte `/login` i `/legal`
- Sessió JWT validada per l'API abans de qualsevol accés a dades

### Rols
| Rol | Accés |
|---|---|
| `admin` | Tot + panell d'administració + audit log + gestió d'usuaris |
| `direccion` | Tot el contingut sense restriccions de scope |
| `delegado` | Limitat a les àrees assignades (ex: medi ambient, comerç) |
| `concejal` | Limitat al seu municipi i àrees |

### RGPD — Ofuscació de noms
- Camp `user_profiles.anonimizar_nombres` per usuari
- Si actiu i el rol no té accés complet: els noms particulars (assistents d'actes, autors de mencions socials) es redueixen a inicials (ex: "Joan Garcia" → "J. G.")
- Els càrrecs públics (regidors, alcaldes, diputats) sempre mantenen nom complet

### Audit log
- Tota acció queda registrada a `usage_log` (consulta chat, cerca, visualització d'actes, export, login)
- Panell `/admin → Audit log` per traçar qui consulta què (missió: garantir bon ús i coherència ideològica)
- Summary per usuari amb comptadors 30d

---

## 3. Fonts de dades

| Font | Ritme | Què obtenim |
|---|---|---|
| **CKAN Seu-e.cat** | cada 6h | 82.352 actes PDF de plens municipals |
| **Socrata Municat** | setmanal | 10.591 càrrecs electes + 947 municipis |
| **Datasets Generalitat** | setmanal | eleccions, alcaldes, mocions, presupostos, població, iniciatives Parlament |
| **Parlament.cat DSPC** | diari 2am | sessions plenàries i Diari de Sessions |
| **RSS premsa** | cada 15min | Vilaweb, Nació Digital, Ara, ElNacional, ElPuntAvui |
| **Bluesky API** | cada 15min | mencions públiques amb keywords AC i temes polítics |

---

## 4. Pipeline de processament

Cada acta passa per 5 estats: `discovered → queued → downloaded → extracted → structured`.

1. **Descobriment**: sincronització amb CKAN, llista d'URLs pendents
2. **Descàrrega**: PDF a storage docker
3. **Extracció**: pdfplumber (natiu) + Tesseract OCR (fallback)
4. **Estructuració LLM** (GPT-5.4-mini via OpenClaw): punts d'ordre del dia, tema, resultat, partit proponent, resum
5. **Post-processament**: detecció de coherència, generació d'alertes

Tasks Celery amb rate-limit i back-off exponencial per protegir la quota compartida d'OpenClaw.

---

## 5. Funcionalitats per pàgina

### `/` — Dashboard
- KPIs: municipis monitorats, actes processades, votacions, alertes pendents
- Mapa de Catalunya amb municipis amb presència AC
- Pipeline live: catàleg, descarregades, extretes, estructurades, en procés, errors
- Temes tendència
- Activitat recent

### `/buscar` — Cerca full-text
- Cerca a text complet d'actes (PostgreSQL GIN index)
- Filtre per municipi, tema, data
- Resultats amb municipi + data + puntuació

### `/chat` — Chatbot d'anàlisi
Prompt reescrit en **mode anàlisi**:
- Comença amb un veredicte en 1-2 frases
- Max 3-5 bullets amb xifres concretes
- Tanca amb "**¿Y ahora qué?**" accionable
- Idioma = idioma de la pregunta
- 16 tools disponibles (veure §6)
- Historial de converses en localStorage
- Cites de fonts (municipi, data, punt)

### `/alertes` — Alertes automàtiques
Tipus:
- `incoherencia_interna`: mateix partit vota diferent a diferents municipis
- `tendencia_emergente`: tema que creix ràpid en plens
- `tendencia_geo`: tema que salta de 1 a 3+ comarques en 30d
- `reaccion_social`: pleno amb sentiment negatiu majoritari en xarxes

### `/municipis` — Directori
- Llistat 947 municipis amb filtres (comarca, provincia, presència AC, població)
- Detall: composició del pleno, càrrecs, presupostos, eleccions històriques, últims plens

### `/informes` — Informes
- Informe setmanal automàtic per la direcció (dilluns 8am)
- Listat històric

### `/intel` — Intel·ligència (nou)
- **Ranking concejals**: ordre per alineació/divergència amb línia del partit
- **Tendències emergents**: temes amb creixement vs 30d anteriors
- **Promeses incomplertes**: creuament Parlament ↔ municipal del partit rival

### `/parlament` — Parlament de Catalunya (nou)
- Sessions plenàries, comissions, DSPC descoberts
- Punts estructurats
- Contradiccions rival: tema defensat al Parlament vs rebutjat als municipis

### `/recepcio` — Recepció social (nou)
- Grid de temes amb distribució de sentiment (+/neutre/-)
- Timeline de mencions recents amb enllaç a la font
- Filtre per tema i finestra temporal

### `/suscripcions` — Subscripcions (nou)
- Vincular Telegram amb codi (deep link `t.me/alianza_catalana_bot?start=vincular_X`)
- Crear subscripcions: nom, temes, municipis opcionals, canal (email/Telegram/ambdós), cron
- Previsualització dry-run del brief
- Gestió/eliminació

### `/admin` — Panell admin (nou)
- Resum: activitat 30d per usuari
- Usuaris: llista amb rol, àrees, municipis assignats
- Audit log: totes les consultes amb detall
- Gestió via API (`/api/admin/users/{id}/profile|areas|municipios`)

### `/settings` — Configuració
- Configuració usuari

### `/login` — Accés
- Password o magic link
- Redirecció a `next` després del login

---

## 6. Tools del chatbot (16)

| Tool | Què retorna |
|---|---|
| `buscar_actas(query)` | Text complet en actes |
| `buscar_votaciones(partido)` | Historial votacions per partit |
| `info_municipio(nombre)` | Composició del pleno + plens recents |
| `estadisticas()` | Stats globals sistema |
| `buscar_argumentos(query)` | Intervencions i arguments |
| `buscar_por_tema(tema)` | Punts per tema |
| `comparar_partidos(p1, p2)` | Comparativa votacions |
| `elecciones_municipio(nombre)` | Resultats electorals històrics |
| `historial_alcaldes(nombre)` | Alcaldes des de 1979 |
| `mociones_govern(query)` | Mocions al Govern Generalitat |
| `presupuesto_municipio(nombre)` | Presupostos per any |
| `poblacion_municipio(nombre)` | Evolució demogràfica |
| `iniciativas_parlament(query)` | Iniciatives parlamentàries |
| `recepcion_social(tema, municipio, dias)` | Eco xarxes/premsa |
| `tendencias_emergentes()` | Temes amb creixement |
| `ranking_concejales(partido, municipio)` | Alineació concejals |

---

## 7. Monitor de votacions

Cada vot d'un concejal queda registrat a `votaciones` amb:
- `punto_id` → tema i municipi
- `cargo_electo_id` → identitat del concejal
- `partido` → grup polític
- `sentido` → a_favor / en_contra / abstencion

Explotació:
- **Coherència**: detector cross-municipi troba mateix partit amb vot oposat al mateix tipus de punt
- **Ranking**: vista SQL `v_ranking_concejales` calcula % d'alineació amb la moda del vot del partit
- **Divergents propis**: `/intel → Ranking concejales?partido=AC&order=divergencia`

---

## 8. Mapa de discurs

- Taula `argumentos`: intervenció, posició (a favor/en contra), partit, concejal
- Taula `linea_partido`: missatges oficials del partit per tema
- Tool chat `buscar_argumentos(query)` troba qui ha dit què
- Permet contrastar discurs oficial vs intervencions reals

---

## 9. Informes temàtics personalitzats

Flux:
1. Usuari a `/suscripcions` crea una subscripció amb: temes (medi ambient, comerç, pesca, agricultura, caça, etc.), municipis (opcional), canal (email/Telegram), cron (`0 8 * * 5` = divendres 8h)
2. Beat Celery `dispatch-subscripciones` cada 60s comprova quines toquen (via `croniter`)
3. `thematic_brief.py` recopila:
   - Punts dels plens dels temes en la finestra temporal
   - Agregat de recepció social (sentiment per tema)
   - Alertes recents
4. GPT-5.4 redacta amb prompt executiu:
   - **Titular en 1 frase**
   - **Moviments clau** (3-5 bullets amb municipi + xifra)
   - **Eco social**
   - **Riscos / oportunitats**
   - **Què vigilar la setmana que ve**
5. Envia per email (Resend) i/o Telegram al chat vinculat

---

## 10. Inteligència competitiva

### Sobre partits rivals
- `buscar_votaciones(partido=X)` → què han votat arreu
- `comparar_partidos(p1, p2)` → diferències i coincidències
- `v_contradicciones_rival` i `/intel → Promeses incomplertes`: tema que **defensen al Parlament però rebutgen quan governen municipis**

### Sobre el territori
- `v_tendencias_emergentes` → temes que creixen (UI `/intel`)
- `info_municipio` + `buscar_por_tema` per conèixer preocupacions locals
- Alertes `tendencia_geo` quan un tema salta de 1 a 3+ comarques

### Preparar concejals propis
- `ranking_concejales(partido=AC, order=divergencia)` → concejals que voten diferent a la línia
- `buscar_argumentos` → què diu l'oposició en altres plens (per anticipar debats)
- `buscar_votaciones(partido=AC)` → bones pràctiques a replicar

---

## 11. Comunicació i medis

### `/chat` → GeneradorRRSS (component)
4 templates estructurats:
- **Tweet / X**: <=260 caràcters, gancho + dada + CTA + 1-2 hashtags
- **Post LinkedIn**: hook + 3-4 bullets + tesi + pregunta oberta
- **Missatge Telegram**: títol negreta + 3 bullets amb emoji + CTA
- **Contingut localitzat**: "En el teu municipi votaren X, en el veí Y…"

### Promeses incomplertes
Pàgina `/intel → Promeses incomplertes` ja documenta casos de contradicció rival per alimentar notes de premsa.

---

## 12. Rendició de comptes

### Si AC governa
- `buscar_votaciones(partido=AC)` amb filtres temporals → llistat d'aprovats
- Dashboard stats per municipi
- Subscripció temàtica "Gestió AC" per rebre setmanalment què s'ha aprovat a tots els municipis AC

### Informes de gestió per municipi
- `thematic_brief` accepta `municipios[]` → brief localitzat
- 947 municipis possibles, un per subscripció

---

## 13. Alertes

Generades automàticament cada 4h (`detect-emerging`):

| Tipus | Condició | Severitat |
|---|---|---|
| `incoherencia_interna` | Mateix partit, vot oposat mateix tipus punt, +1 municipi | mitjana |
| `tendencia_emergente` | Tema +5 punts vs 30d anteriors | mitjana |
| `tendencia_geo` | Tema salta d'1 a 3+ comarques en 30d | alta |
| `reaccion_social` | >50% sentiment negatiu en >20 mencions associades a un pleno | alta |

Totes apareixen a `/alertes` i s'inclouen al brief setmanal + brief temàtic.

---

## 14. Operativa

### Cron schedule (Celery beat)

| Task | Freq |
|---|---|
| `process-backfill-batch` | 30s |
| `process-parlament-batch` | 2min |
| `dispatch-subscripciones` | 60s |
| `classify-social-batch` | 90s |
| `ingest-social` | 15min |
| `detect-emerging` | 4h |
| `discover-parlament` | diari 2am |
| `sync-ckan-catalog` | 6h |
| `sync-municat` | dilluns 3am |
| `weekly-report` | dilluns 8am |

### Servidor
- `root@85.215.105.45`, projecte `/opt/ayuntamentia`
- Supabase a `supabase.odoo.barcelona` (JWT secret compartit)
- OpenClaw a `127.0.0.1:10531` (proxy OAuth ChatGPT, compartit)

### Protecció quota
- Back-off exponencial a `openclaw_client.py` davant 429/5xx
- `BACKFILL_RATE_PER_MINUTE=10` (structuring LLM)
- Descàrregues paral·lel concurrency=4

---

## 15. Base de dades (resum)

**Operacional**: `municipios`, `cargos_electos`, `actas`, `actas_analisis`, `puntos_pleno`, `votaciones`, `argumentos`, `linea_partido`, `alertas`, `pipeline_stats`

**Datasets Generalitat**: `elecciones`, `alcaldes`, `mociones`, `poblacion`, `presupuestos`, `iniciativas_parlament`

**Usuaris i governança**: `user_profiles`, `user_areas`, `user_municipios`, `usage_log`, `subscripciones`, `telegram_link_codes`

**Social i Parlament**: `mencion_social`, `sesiones_parlament`

**Vistes analítiques**:
- `v_ranking_concejales` — % alineació per concejal
- `v_tendencias_emergentes` — delta temes 30d
- `v_contradicciones_rival` — Parlament vs municipal

---

## 16. Stack tècnic

- **Pipeline**: Python 3.12 + Celery + Redis + psycopg2 + pdfplumber + Tesseract
- **API**: FastAPI + python-jose (JWT) + openai SDK
- **Web**: Next.js 16 (App Router) + React 19 + TailwindCSS 4 + Supabase SSR
- **Bot**: python-telegram-bot
- **BD**: PostgreSQL (Supabase) + GIN full-text índex
- **LLM**: OpenAI via OpenClaw proxy (GPT-5.4 / GPT-5.4-mini)
- **Email**: Resend (opcional)

---

## 17. Credencials de test (temporals)

- Usuari admin: `test@ayuntamentia.cat` / `Test1234!`

(Crear usuaris reals via `./scripts/create_admin.sh` i després canviar rol a `delegado` o `concejal` segons correspongui.)

---

## 18. Roadmap pendent

Tots els punts demanats pel client estan implementats. Pendents de millora:

1. Whisper per transcripció de grabacions del Parlament (coste compute alt)
2. Template de "gestió propi" a la pàgina d'informes amb botons d'auto-generació
3. Cache Redis als endpoints més pesats del dashboard
4. Tests automatitzats cobertura 80%
5. Vídeo demo 5 min per roadshow
