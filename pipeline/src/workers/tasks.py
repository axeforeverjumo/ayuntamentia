"""Celery tasks para el pipeline de AyuntamentIA."""

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
    """Post-procesamiento: embeddings + coherencia."""
    from ..db import get_db, get_cursor
    from ..embeddings.generator import index_punto
    from ..coherencia.detector import check_coherence_for_punto

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("SELECT id FROM puntos_pleno WHERE acta_id = %s", (acta_id,))
            puntos = cur.fetchall()

    for p in puntos:
        try:
            index_punto(p["id"])
        except Exception as e:
            logger.error(f"Failed to index punto {p['id']}: {e}")

        try:
            check_coherence_for_punto(p["id"])
        except Exception as e:
            logger.error(f"Failed coherence check for punto {p['id']}: {e}")


@app.task(name="src.workers.tasks.process_backfill_batch")
def process_backfill_batch():
    """Procesa un batch del backfill: toma actas pendientes y las encola."""
    from ..descarga.downloader import get_next_batch
    batch = get_next_batch(batch_size=5)
    for acta_id in batch:
        download_acta.delay(acta_id)
    return len(batch)


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
