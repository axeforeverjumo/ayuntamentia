# Diagnóstico de falta de actualización automática en `/reputacio`

## Tipo de tarea
Exploración / diagnóstico. No se modificó código de producción.

## Objetivo
Reproducir y localizar por qué la página `/reputacio` no se actualiza sola y por qué la última noticia visible queda fijada en `2026-04-28`.

## Archivos inspeccionados
- `web/src/app/reputacio/page.tsx`
- `web/src/app/intel/page.tsx`
- `api/src/routes/reputacio.py`
- `api/src/routes/intel.py`
- `api/src/main.py`
- `pipeline/src/workers/celery_app.py`
- `pipeline/src/workers/tasks.py`
- `docker-compose.yml`
- `api/Dockerfile`
- `pipeline/Dockerfile`
- `.env.example`
- `api/requirements.txt`

## Hallazgos principales

### 1. `/reputacio` no tiene refresco automático en cliente
En `web/src/app/reputacio/page.tsx`:
- Se hace `fetch` al montar la página para:
  - `/api/reputacio/stats?dies=30`
  - `/api/reputacio/sentiment-partit?partit=...&dies=30`
  - `/api/reputacio/temes-negatius?partit=...&dies=30`
- No existe `setInterval`, polling, SSE, WebSocket, `router.refresh()`, ni revalidación periódica.
- El botón **“Sync ara”** hace un `POST` manual a `/api/reputacio/ingest` y luego `window.location.reload()`.

**Conclusión:** el cliente solo se actualiza al entrar, cambiar de partido o pulsar manualmente “Sync ara”. Aunque la ingesta funcione, la vista abierta no se refresca sola.

### 2. Sí existe scheduler de backend para ingesta cada 30 minutos
En `pipeline/src/workers/celery_app.py` existe esta entrada en `beat_schedule`:

```python
"ingest-premsa": {
    "task": "src.workers.tasks.ingest_premsa",
    "schedule": crontab(minute="*/30"),
}
```

Y en `pipeline/src/workers/tasks.py`:

```python
@app.task(name="src.workers.tasks.ingest_premsa")
def ingest_premsa():
    import httpx
    api_url = os.getenv("API_INTERNAL_URL", "http://localhost:8050")
    r = httpx.post(f"{api_url}/api/reputacio/ingest", timeout=120)
```

**Conclusión:** en diseño, el backend sí intenta refrescar datos automáticamente cada 30 minutos.

### 3. El riesgo más fuerte está en la comunicación pipeline → API
La tarea programada depende de este endpoint HTTP interno:
- variable: `API_INTERNAL_URL`
- fallback: `http://localhost:8050`

Problema observado:
- `docker-compose.yml` pone `network_mode: host` para `pipeline-worker`, `pipeline-beat` y `api`.
- `api` escucha en `0.0.0.0:8050` según `api/Dockerfile`.
- Pero `API_INTERNAL_URL` no aparece documentada en `.env.example`.
- Si en despliegue el contenedor API no está realmente accesible en `localhost:8050` desde el entorno del beat, la tarea fallará silenciosamente devolviendo `{"error": ...}` y solo dejará warning en logs.

Además, `ingest_premsa()` captura excepciones y **no re-lanza**:

```python
except Exception as e:
    logger.warning(f"Error ingesting premsa: {e}")
    return {"error": str(e)}
```

Esto puede hacer que el scheduler siga “verde” aunque no esté actualizando nada.

### 4. La ingesta no limpia noticias antiguas físicamente
En `api/src/routes/reputacio.py`:
- `ingest_rss_feeds()` solo inserta artículos nuevos con `ON CONFLICT DO NOTHING`.
- No existe ninguna rutina de borrado/prune/cleanup sobre `premsa_articles`.
- La UI consulta siempre con `dies=30`, así que **ocultar** noticias viejas depende del filtro temporal en SQL, no de un borrado real.

Consultas relevantes:
- `/stats`: `WHERE data_publicacio >= since`
- `/sentiment-partit`: `WHERE %s = ANY(partits) AND data_publicacio >= %s`
- `/temes-negatius`: mismo patrón temporal

**Conclusión:** si se espera “eliminar las viejas” de la base de datos, eso no está implementado. Si se espera solo que desaparezcan visualmente pasados 30 días, eso sí debería ocurrir siempre que `data_publicacio` y la ingesta estén sanas.

### 5. Posible causa adicional: feeds sin entradas nuevas o con fechas antiguas
La lógica de fecha visible depende completamente de `entry.published_parsed` / `entry.updated_parsed`:

```python
published = entry.get("published_parsed") or entry.get("updated_parsed")
```

Si un feed:
- no publica fechas correctamente,
- reaprovecha entradas antiguas,
- o devuelve siempre contenido viejo,

la tabla seguirá mostrando máximas fechas antiguas aunque la tarea corra.

No se pudo verificar el contenido real de `premsa_articles` porque en entorno local `DATABASE_URL` no está cargada para `run_shell`.

## Evidencia reproducible

### Cliente sin auto-refresh
Archivo: `web/src/app/reputacio/page.tsx`
- Solo hay `useEffect` de carga inicial.
- No hay polling, intervalo, SSE, websocket ni refresh reactivo.
- El único refresh explícito es el botón manual “Sync ara”.

### Cron/scheduler existente
Archivo: `pipeline/src/workers/celery_app.py`
- Tarea `ingest-premsa` programada cada 30 minutos.

### Camino real de ejecución
Archivo: `pipeline/src/workers/tasks.py`
- La tarea pega por HTTP a `/api/reputacio/ingest`.
- Usa `API_INTERNAL_URL` o fallback `http://localhost:8050`.
- Captura errores y devuelve objeto de error sin fallar de forma dura.

### Ausencia de limpieza
Archivo: `api/src/routes/reputacio.py`
- No existe `DELETE FROM premsa_articles`, TTL, job de prune, ni limpieza por antigüedad.

## Causa raíz probable
La causa más probable es **combinada**:

1. **La página no tiene actualización automática en cliente**, así que una sesión abierta queda congelada hasta recarga o acción manual.
2. **La ingesta automática depende de una llamada HTTP interna frágil** (`API_INTERNAL_URL` / `localhost:8050`) y puede estar fallando sin visibilidad fuerte.
3. **No existe limpieza física de noticias antiguas**, solo filtrado por ventana de 30 días.

## Lo que falta para confirmación total
Para confirmar exactamente por qué la última fecha visible queda en `2026-04-28`, hace falta ejecutar en entorno con variables reales:
- consultar `SELECT max(data_publicacio) FROM premsa_articles;`
- revisar logs de `pipeline-beat` y `pipeline-worker` para `ingest_premsa`
- probar manualmente `POST /api/reputacio/ingest`
- verificar accesibilidad efectiva de `http://localhost:8050` o el valor de `API_INTERNAL_URL`
- comprobar si los RSS están devolviendo noticias nuevas y con fechas correctas

## Recomendación técnica
Antes de implementar solución:
1. Verificar logs reales del beat/worker.
2. Verificar estado actual de `premsa_articles` en BD.
3. Añadir observabilidad mínima al job de ingesta.
4. Implementar auto-refresh en cliente si se quiere que la página abierta se actualice sola.
5. Si el requisito es borrar históricas, crear job explícito de cleanup.
