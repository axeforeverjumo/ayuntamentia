"""Celery tasks para el pipeline de AjuntamentIA."""

import logging
from .celery_app import app
from ..config import config

logger = logging.getLogger(__name__)


@app.task(name="src.workers.tasks.sync_ckan_catalog")
def sync_ckan_catalog():
    """Sincroniza catálogo de actas desde CKAN."""
    from ..ingesta.ckan_client import sync_actas_catalog
    return sync_actas_catalog(years_back=config.BACKFILL_YEARS)


@app.task(name="src.workers.tasks.sync_municat_data")
def sync_municat_data():
    """Sincroniza municipios y cargos desde Municat."""
    from ..ingesta.socrata_client import sync_all
    return sync_all()


@app.task(name="src.workers.tasks.download_acta", rate_limit="10/m")
def download_acta(acta_id: int):
    """Descarga un PDF de acta."""
    from ..descarga.downloader import process_download
    success = process_download(acta_id)
    if success:
        extract_acta_text.delay(acta_id)
    return success


@app.task(name="src.workers.tasks.extract_acta_text", rate_limit="30/m")
def extract_acta_text(acta_id: int):
    """Extrae texto de un PDF descargado."""
    from ..extraccion.pdf_extractor import process_extraction
    success = process_extraction(acta_id)
    if success:
        structure_acta.delay(acta_id)
    return success


@app.task(name="src.workers.tasks.structure_acta", rate_limit=f"{config.BACKFILL_RATE_PER_MINUTE}/m")
def structure_acta(acta_id: int):
    """Estructura un acta con LLM."""
    from ..llm.structurer import process_structuring
    success = process_structuring(acta_id)
    if success:
        post_structure.delay(acta_id)
    return success


@app.task(name="src.workers.tasks.post_structure")
def post_structure(acta_id: int):
    """Post-procesamiento: coherencia (embeddings desactivados hasta configurar endpoint)."""
    from ..db import get_db, get_cursor

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("SELECT id FROM puntos_pleno WHERE acta_id = %s", (acta_id,))
            puntos = cur.fetchall()

    # Embeddings disabled for now — bridge doesn't support embeddings endpoint
    # TODO: enable when embeddings API is configured

    for p in puntos:
        try:
            from ..coherencia.detector import check_coherence_for_punto
            check_coherence_for_punto(p["id"])
        except Exception as e:
            logger.error(f"Failed coherence check for punto {p['id']}: {e}")


@app.task(name="src.workers.tasks.process_backfill_batch")
def process_backfill_batch():
    """Procesa un batch del backfill: toma actas pendientes i les encola.

    Cobreix tres etapes per evitar que reintents quedin orfes:
      - discovered  → download_acta
      - downloaded  → extract_acta_text
      - extracted   → structure_acta
    """
    from ..descarga.downloader import get_next_batch
    from ..db import get_db, get_cursor

    n_total = 0

    batch = get_next_batch(batch_size=5)
    for acta_id in batch:
        download_acta.delay(acta_id)
    n_total += len(batch)

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT id FROM actas
                WHERE status = 'downloaded' AND retry_count < %s
                ORDER BY priority DESC, fecha DESC LIMIT 10
                FOR UPDATE SKIP LOCKED
            """, (config.MAX_RETRIES,))
            ids = [r["id"] for r in cur.fetchall()]
        for acta_id in ids:
            extract_acta_text.delay(acta_id)
        n_total += len(ids)

        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT id FROM actas
                WHERE status = 'extracted' AND retry_count < %s
                ORDER BY priority DESC, fecha DESC LIMIT 10
                FOR UPDATE SKIP LOCKED
            """, (config.MAX_RETRIES,))
            ids = [r["id"] for r in cur.fetchall()]
        for acta_id in ids:
            structure_acta.delay(acta_id)
        n_total += len(ids)

    return n_total


@app.task(name="src.workers.tasks.dispatch_subscripciones")
def dispatch_subscripciones():
    """Dispara briefs temáticos de las subscripciones que toquen ahora."""
    from .scheduler_dynamic import due_subscriptions, send_brief
    ids = due_subscriptions()
    sent = 0
    for sid in ids:
        try:
            if send_brief(sid):
                sent += 1
        except Exception as e:
            logger.error(f"Error enviando brief sub={sid}: {e}")
    return {"due": len(ids), "sent": sent}


@app.task(name="src.workers.tasks.ingest_social")
def ingest_social():
    """Ingesta menciones sociales desde fuentes públicas (Bluesky, RSS)."""
    from ..ingesta.social import ingest_all
    return ingest_all()


@app.task(name="src.workers.tasks.classify_social_batch")
def classify_social_batch():
    """Clasifica menciones sociales sin clasificar (tema, sentiment, municipio)."""
    from ..ingesta.social_classifier import classify_pending_batch
    return classify_pending_batch(limit=20)


@app.task(name="src.workers.tasks.discover_parlament")
def discover_parlament():
    """Descubre nuevas sesiones del Parlament (DSPC)."""
    from ..ingesta.parlament import discover_sesiones
    n = discover_sesiones()
    return {"discovered": n}


@app.task(name="src.workers.tasks.process_parlament_batch")
def process_parlament_batch():
    """Avanza el pipeline DSPC: download → extract → structure."""
    from ..ingesta.parlament_pipeline import (
        get_next_batch, download_sesion, extract_sesion, structure_sesion,
    )
    batch = get_next_batch(batch_size=2)
    for sid in batch:
        if download_sesion(sid):
            if extract_sesion(sid):
                structure_sesion(sid)
    return len(batch)


@app.task(name="src.workers.tasks.detect_emerging")
def detect_emerging():
    """Genera alertas de tendencias emergentes (plenos + social)."""
    from ..coherencia.tendencias import detect_and_alert
    return detect_and_alert()


@app.task(name="src.workers.tasks.generate_weekly_report")
def generate_weekly_report():
    """Genera el informe semanal automático."""
    from datetime import date, timedelta
    from ..db import get_db, get_cursor
    from ..llm.openclaw_client import generate_weekly_report as gen_report

    end = date.today()
    start = end - timedelta(days=7)

    with get_db() as conn:
        with get_cursor(conn) as cur:
            # Gather stats
            cur.execute("SELECT COUNT(*) as n FROM actas WHERE fecha BETWEEN %s AND %s AND status = 'structured'", (start, end))
            actas_count = cur.fetchone()["n"]

            cur.execute("""
                SELECT p.tema, COUNT(*) as n FROM puntos_pleno p
                WHERE p.fecha BETWEEN %s AND %s
                GROUP BY p.tema ORDER BY n DESC LIMIT 10
            """, (start, end))
            temas = cur.fetchall()

            cur.execute("""
                SELECT a.severidad, COUNT(*) as n FROM alertas a
                WHERE a.created_at >= %s GROUP BY a.severidad
            """, (start,))
            alertas = cur.fetchall()

            cur.execute("""
                SELECT p.titulo, p.resumen, m.nombre, p.fecha, p.resultado, p.tema
                FROM puntos_pleno p JOIN municipios m ON p.municipio_id = m.id
                JOIN votaciones v ON v.punto_id = p.id
                WHERE p.fecha BETWEEN %s AND %s AND UPPER(v.partido) LIKE %s
                ORDER BY p.fecha DESC LIMIT 10
            """, (start, end, f"%{config.PARTY_NAME}%"))
            votaciones_ac = cur.fetchall()

    data = {
        "periodo": {"inicio": str(start), "fin": str(end)},
        "actas_procesadas": actas_count,
        "temas_top": [dict(t) for t in temas],
        "alertas": [dict(a) for a in alertas],
        "votaciones_ac": [dict(v) for v in votaciones_ac],
    }

    report = gen_report(data)
    logger.info(f"Weekly report generated: {len(report)} chars")
    return report


@app.task
def evaluate_alert_rules():
    """Evalúa todas las reglas de alerta activas y crea alertas por coincidencias.

    Cada regla tiene un last_run_at que funciona como cursor para no procesar
    actas ya evaluadas. El evaluator usa UNIQUE (regla_id, punto_id) para
    evitar duplicados en carreras.
    """
    # Importación diferida: el pipeline no necesita cargar el módulo completo del API.
    # Si el pipeline está en contenedor separado, necesita acceso al código api/.
    import sys, os
    api_src = os.path.join(os.path.dirname(__file__), "..", "..", "..", "api", "src")
    if api_src not in sys.path:
        sys.path.insert(0, api_src)

    try:
        from services.alertas_evaluator import run_all_active_rules  # noqa: E402
    except Exception:
        # En el setup actual, el pipeline y el API están en contenedores separados.
        # Como fallback, llamamos al endpoint HTTP interno.
        import httpx
        api_url = os.getenv("API_INTERNAL_URL", "http://localhost:8050")
        token = os.getenv("ALERT_RULES_CRON_TOKEN", "")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = httpx.post(f"{api_url}/api/alertas/reglas/_run_all", headers=headers, timeout=300)
        r.raise_for_status()
        result = r.json()
        logger.info(f"Reglas evaluadas via HTTP: {result}")
        return result

    result = run_all_active_rules()
    logger.info(f"Reglas evaluadas: {result}")
    return result


@app.task(name="src.workers.tasks.ingest_premsa")
def ingest_premsa():
    """Ingesta RSS de premsa catalana — cada 30 min."""
    import httpx

    api_candidates = [
        os.getenv("API_INTERNAL_URL"),
        "http://api:8050",
        "http://localhost:8050",
    ]
    tried = []

    for api_url in [candidate for candidate in api_candidates if candidate]:
        try:
            tried.append(api_url)
            r = httpx.post(f"{api_url}/api/reputacio/ingest", timeout=120)
            r.raise_for_status()
            result = r.json()
            result["api_url"] = api_url
            logger.info(f"Premsa ingestada via {api_url}: {result}")
            return result
        except Exception as e:
            logger.warning(f"Error ingesting premsa via {api_url}: {e}")

    return {"error": "no_reachable_api", "tried": tried}
