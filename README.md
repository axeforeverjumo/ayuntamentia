# AjuntamentIA

Plataforma d'intel·ligència política municipal per a Catalunya. Monitoritza actes de plens, vots, argumentaris i cobertura de premsa dels 947 municipis catalans, i dóna munició política utilitzable a través d'un xat amb modes específics (Monitor / Atacar / Defensar / Comparar / Oportunitat).

---

## 🎯 ENFOC ACTUAL: **Aliança Catalana**

> **Important** — aquesta instància està configurada per a **Aliança Catalana** com a client. Tot el POV dels prompts, les preguntes suggerides als modes polítics, el branding ("L'arma política d'Aliança Catalana") i les preguntes per defecte estan orientades a AC.
>
> - **Client**: `CLIENT_PARTIDO=AC` · `CLIENT_NOMBRE=Aliança Catalana`
> - **Domini producció**: https://alianza-catalana.factoriaia.com
> - **Rivals considerats per defecte** (ordre de prioritat): JxCat, ERC, PSC, CUP, PP, VOX, Cs
>
> **Les consultes a la plataforma poden preguntar per qualsevol partit** (PP, ERC, PSC, Junts, etc.) — els plens són públics i les dades són compartides. El que canvia segons el client és només el "nosaltres" implícit quan l'usuari diu "defensar la nostra posició" o "on podem créixer".
>
> El codi **està preparat per a multi-tenant** (suporta desplegar a PP, PSOE, ERC, etc. amb només canviar variables d'entorn), però **avui ens centrem només en AC**. Si mai es vol obrir a un altre partit, veure [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md).

---

## Arquitectura

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  web/ (Next.js 16)  │───▶│  api/ (FastAPI)  │───▶│   Postgres      │
│  Chat + Alertes +   │    │  /api/chat/      │    │   Supabase      │
│  Dashboard + Intel  │    │  /api/alertas/   │    │   947 municipis │
└─────────────────────┘    │  /api/intel/     │    │   93k actes     │
                           │  ...             │    │   142k punts    │
┌─────────────────────┐    │                  │    │   18k argumentos│
│  telegram/          │───▶│                  │    └─────────────────┘
│  Bot per a usuaris  │    └──────────────────┘            ▲
└─────────────────────┘            │                       │
                                   ▼                       │
                           ┌──────────────────┐            │
                           │ OpenClaw proxy   │    ┌───────┴───────┐
                           │ (LLM gpt-5.4)    │    │ pipeline/     │
                           │ port 10531       │    │ Celery worker │
                           └──────────────────┘    │ ingesta actes │
                                                   └───────────────┘
```

## Components

| Servei | Stack | Puerto | Descripció |
|---|---|---|---|
| `web/` | Next.js 16 + React 19 + Tailwind v4 | 3100 | Frontend: chat, alertes, municipis, admin |
| `api/` | FastAPI + psycopg2 | 8050 | Endpoints de chat, alertes, intel, admin |
| `pipeline/` | Celery + Redis | — | Descàrrega + parseig d'actes amb LLM |
| `telegram/` | python-telegram-bot | — | Bot per a usuaris mòbils |
| `supabase/` | Postgres + migrations | 5432 | DB compartida |

## Funcionalitats principals del chat

- **📡 Monitor**: "Què es diu del PP aquest mes?" → qui parla, com vota, qui els menciona, eco en premsa.
- **⚔️ Atacar**: "Dossier contra JxCat sobre civisme" → munició política amb cites literals, contradiccions, frases atacables.
- **🛡️ Defensar**: "Com defensar el vot d'AC sobre civisme?" → argumentari amb dades.
- **⚖️ Comparar**: "ERC vs Junts en habitatge 2026" → contrast directe.
- **💡 Oportunitat**: "On pot créixer AC ara?" → forats comunicatius + rivals dividits.

Detecció temporal: "aquest mes", "al març 2026", "darrers 60 dies", "entre gener i març" — el router ho entén i filtra.

## Desenvolupament local

```bash
cp .env.example .env
# Omplir credentials (Supabase, OpenClaw, Telegram token)
docker compose build
docker compose up -d
```

Web: http://localhost:3100 · API: http://localhost:8050/api/health

## Deploy producció

```bash
./scripts/deploy.sh
```

Requisits: SSH com a `root@85.215.105.45`, repo `/opt/ayuntamentia/`, nginx configurat a `alianza-catalana.factoriaia.com`.

## Documentació

- [`docs/VISION_PROYECTO.md`](docs/VISION_PROYECTO.md) — visió general del projecte
- [`docs/ESPECIFICACION_FUNCIONAL.md`](docs/ESPECIFICACION_FUNCIONAL.md) — features per rol
- [`docs/ESTRATEGIA_DATOS.md`](docs/ESTRATEGIA_DATOS.md) — com s'obtenen i parsen les actes
- [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md) — guia d'ús
- [`docs/MANUAL_ADMIN.md`](docs/MANUAL_ADMIN.md) — guia d'administració
- [`docs/GUIA_TESTER.md`](docs/GUIA_TESTER.md) — casos de validació
- [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md) — ⚠️ desactivat en el focus actual · només referència futura
- [`specs/dades/SPEC.md`](specs/dades/SPEC.md) — font tècnica de veritat per a la configuració auditable de `trending_score` a BD

## Task diària de recalcul de tendències

La persistència diària del `trending_score` del dashboard es fa amb una task de Celery del pipeline:

- Task registrada: `src.workers.trending_tasks.recalculate_daily_trending_scores`
- Beat schedule MVP: cada dia a les `02:15` amb `enable_utc=true` al worker/beat

Execució manual en local/staging:

```bash
python -m pipeline.src.workers.trending_tasks
```

O bé via Celery shell/client:

```bash
python -c "from pipeline.src.workers.trending_tasks import recalculate_daily_trending_scores; print(recalculate_daily_trending_scores())"
```

Execució real dins la infraestructura Docker del projecte:

```bash
docker compose up -d redis pipeline-worker pipeline-beat
docker compose logs --tail=100 pipeline-beat
docker compose logs --tail=100 pipeline-worker
```

Comprovació manual de la task registrada via worker Docker:

```bash
docker compose exec pipeline-worker celery -A src.workers.celery_app inspect registered | grep recalculate_daily_trending_scores
docker compose exec pipeline-worker celery -A src.workers.celery_app call src.workers.trending_tasks.recalculate_daily_trending_scores
```

Comprovació del beat schedule carregat:

```bash
docker compose exec pipeline-beat celery -A src.workers.celery_app beat --loglevel=info
```

> Nota: el runner local d'aquesta tasca no té el paquet `celery` instal·lat al Python host, però el contenidor `pipeline` sí que el declara a `pipeline/requirements.txt` i `docker-compose.yml` ja arrenca `pipeline-worker` i `pipeline-beat` amb `celery -A src.workers.celery_app ...`.

Què fa:
- reutilitza `api/src/services/trending_score_service.py`
- recalcula scores sobre les dades actuals
- actualitza només columnes compatibles que ja existeixin a `temas_trend_signals`
- si l'esquema no té cap columna de score compatible, no crea res nou i deixa traça a logs

Com verificar-ho:
- revisar els logs del worker/execució manual per veure el resum `processed / attempted / updated`
- consultar `temas_trend_signals` i comprovar si s'han actualitzat els camps existents compatibles (`trend_score`, `trending_score`, `widget_trending_score`, `base_score`, `score_premsa`, `score_xarxes`, `delta_plens`)
- tornar a executar la task: el recompte de files actualitzades pot repetir-se, però no s'han de crear duplicats perquè només es fan `UPDATE` sobre files existents

## Notes de foc

- **Focus ara**: millorar la profunditat política del xat per a AC — narratives cruzades, deteccions de titulacions falses, contradiccions de rivals, eco temàtic.
- **Fora de focus ara**: vendre a altres partits. El codi ho suporta però **no ho priorizem**.
