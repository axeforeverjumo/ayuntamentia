# Manual d'administrador — AyuntamentIA

## Stack

- **Pipeline** (Python + Celery): `pipeline-worker`, `pipeline-beat`, `redis`
- **API** (FastAPI): `ayuntamentia-api-1` port 8050
- **Web** (Next.js 16): `ayuntamentia-web-1` port 3100
- **Telegram bot**: `ayuntamentia-telegram-1`
- **DB**: Supabase Postgres compartit (existeix al servidor)
- **LLM**: OpenClaw proxy `127.0.0.1:10531` (compartit amb altres serveis)

## Servidor

`root@85.215.105.45` · projecte a `/opt/ayuntamentia`

## Operacions habituals

### Crear un usuari nou
```bash
ssh root@85.215.105.45
cd /opt/ayuntamentia
PG_PASSWORD=PrLaCXPsZIAIkX25ZXQAC5E54LRo90uU PG_HOST=172.19.0.4 \
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_KEY .env | cut -d= -f2) \
./scripts/create_admin.sh nom@email.com password "Nom Cognom"
```

Per donar-li rol `delegado` o `concejal`, edita `user_profiles.rol` a la BD o usa
`POST /api/admin/users/{id}/profile` amb `rol="delegado"`.

### Assignar àrees a un delegat
```bash
curl -X PUT https://api.../api/admin/users/<uuid>/areas \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '["medio_ambiente","comercio","pesca"]'
```

### Veure el log d'auditoria
- Web `/admin` → tab "Audit log"
- O via DB: `SELECT * FROM usage_log ORDER BY created_at DESC LIMIT 50;`

### Forçar un brief de subscripció
```bash
curl -X POST .../api/subscripciones/<id>/preview -H "Authorization: Bearer <jwt>"
```

### Reiniciar serveis
```bash
cd /opt/ayuntamentia
docker compose restart pipeline-worker     # workers Celery
docker compose restart pipeline-beat       # scheduler
docker compose restart api web             # backend + frontend
```

### Aplicar una migració nova
```bash
docker run --rm --network host -v /opt/ayuntamentia/supabase/migrations:/m \
  -e PGPASSWORD=PrLaCXPsZIAIkX25ZXQAC5E54LRo90uU postgres:15 \
  psql -h 172.19.0.4 -U postgres -d postgres -f /m/00X_xxx.sql
```

### Desplegar canvis
```bash
ssh root@85.215.105.45
cd /opt/ayuntamentia
git pull
docker compose build && docker compose up -d
```

## Cron tasks (Celery beat)

| Task | Freq | Què fa |
|---|---|---|
| `process-backfill-batch` | 30s | Avança 5 actes municipals al pipeline |
| `process-parlament-batch` | 2min | Avança 2 sesions Parlament |
| `dispatch-subscripciones` | 60s | Dispara briefs de subscripcions actives |
| `classify-social-batch` | 90s | Classifica 20 mencions socials sense classificar |
| `ingest-social` | 15min | Tira RSS premsa + Bluesky |
| `detect-emerging` | 4h | Genera alertes de tendències emergents |
| `discover-parlament` | diari 2h | Descobreix nous DSPC al portal Parlament |
| `sync-ckan-catalog` | 6h | Sincronitza catàleg CKAN d'actes |
| `sync-municat` | dilluns 3h | Sincronitza municipis i càrrecs |
| `weekly-report` | dilluns 8h | Informe setmanal per direcció |

## Variables d'entorn rellevants

```
DATABASE_URL                  postgres ↔ supabase
SUPABASE_URL                  http://localhost:8000
SUPABASE_ANON_KEY             clau pública anon
SUPABASE_SERVICE_KEY          clau service (per crear usuaris)
SUPABASE_JWT_SECRET           per validar tokens al API
NEXT_PUBLIC_SUPABASE_URL      URL pública (per al login web)
NEXT_PUBLIC_SUPABASE_ANON_KEY clau anon pública
NEXT_PUBLIC_API_URL           URL del API per al web
OPENCLAW_BASE_URL             http://localhost:10531/v1
OPENCLAW_MODEL_MINI/FULL      gpt-5.4-mini / gpt-5.4
BACKFILL_RATE_PER_MINUTE      rate limit structuring (default 10)
RESEND_API_KEY                per enviar emails de briefs (opcional)
TELEGRAM_BOT_TOKEN/CHAT_ID    bot Telegram
```

## Troubleshooting

### "Tasques download_acta tornen False en 20ms"
Vol dir que s'estan re-encolant duplicats. Verificar que `get_next_batch` fa
`UPDATE ... SET status='queued' ... FOR UPDATE SKIP LOCKED RETURNING id`.
Si la cua Redis té molts pendents stale: `docker exec ayuntamentia-redis-1 redis-cli DEL celery`.

### "Login no funciona, error de Supabase URL"
Les NEXT_PUBLIC_* es bake al build de Next. Si canvies `.env` cal `docker compose build web`.

### "OpenClaw 429"
Tens back-off exponencial al `openclaw_client.py`. Si veus moltes restries, baixa
`BACKFILL_RATE_PER_MINUTE` a 5.

### "Sense mencions socials"
Comprova logs: `docker logs ayuntamentia-pipeline-worker-1 --since 30m | grep ingest_social`.
RSS pot fallar per User-Agent → s'ha fixat la capçalera.

### "Sense puntos del Parlament"
Cal que s'hagin descobert URLs DSPC primer (`discover_parlament`) i després processar
(`process_parlament_batch`). El primer dispara cada nit, el segon cada 2 min.

## Còpies de seguretat

La BD és Supabase compartit; les còpies de PG s'han de programar a nivell de PG, no aquí.
Els PDFs descarregats viuen al volum docker `pdf-storage`.

## Contactes

- Servidor: `root@85.215.105.45`
- Repo: `https://github.com/axeforeverjumo/ayuntamentia`
