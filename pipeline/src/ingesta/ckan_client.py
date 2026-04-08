"""Cliente para la API CKAN de dadesobertes.seu-e.cat — actas de plenos."""

import logging
from datetime import datetime, timedelta

import httpx

from ..config import config
from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)

CKAN_DATASTORE_URL = f"{config.CKAN_BASE_URL}/api/action/datastore_search"


def fetch_actas_page(offset: int = 0, limit: int = 1000, filters: dict | None = None) -> dict:
    params = {
        "resource_id": config.CKAN_RESOURCE_ID,
        "limit": limit,
        "offset": offset,
    }
    if filters:
        import json
        params["filters"] = json.dumps(filters)

    resp = httpx.get(CKAN_DATASTORE_URL, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["result"]


def fetch_all_actas(since_date: datetime | None = None) -> list[dict]:
    """Descarga todos los registros de actas del CKAN. Con paginación."""
    all_records = []
    offset = 0
    limit = 5000

    while True:
        logger.info(f"Fetching CKAN actas offset={offset}")
        result = fetch_actas_page(offset=offset, limit=limit)
        records = result.get("records", [])
        if not records:
            break

        if since_date:
            records = [
                r for r in records
                if r.get("DATA_ACORD") and
                datetime.fromisoformat(r["DATA_ACORD"].replace("Z", "+00:00")) >= since_date
            ]

        all_records.extend(records)
        offset += limit

        total = result.get("total", 0)
        if offset >= total:
            break

    logger.info(f"Total actas fetched from CKAN: {len(all_records)}")
    return all_records


def sync_actas_catalog(years_back: int | None = None):
    """Sincroniza el catálogo de actas de CKAN con la base de datos local."""
    since = None
    if years_back:
        since = datetime.now() - timedelta(days=years_back * 365)

    records = fetch_all_actas(since_date=since)
    if not records:
        logger.warning("No records fetched from CKAN")
        return 0

    inserted = 0
    with get_db() as conn:
        with get_cursor(conn) as cur:
            for rec in records:
                fecha = rec.get("DATA_ACORD")
                if fecha:
                    fecha = fecha[:10]  # YYYY-MM-DD

                cur.execute("""
                    INSERT INTO actas (external_id, codi_ens, nom_ens, fecha, tipo, url_pdf, codi_acta, status, priority)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'discovered', 0)
                    ON CONFLICT (external_id) DO NOTHING
                """, (
                    rec.get("_id"),
                    str(rec.get("CODI_ENS", "")),
                    rec.get("NOM_ENS", ""),
                    fecha,
                    rec.get("TIPUS", ""),
                    rec.get("ENLLAÇ_ACTA", rec.get("ENLLAC_ACTA", "")),
                    rec.get("CODI_ACTA", ""),
                ))
                if cur.rowcount > 0:
                    inserted += 1

    logger.info(f"Inserted {inserted} new actas into catalog")

    # Link actas to municipios
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                UPDATE actas a
                SET municipio_id = m.id
                FROM municipios m
                WHERE a.codi_ens = m.codi_ens
                AND a.municipio_id IS NULL
            """)
            logger.info(f"Linked {cur.rowcount} actas to municipios")

    # Set priority for AC municipalities
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                UPDATE actas a
                SET priority = 10
                FROM municipios m
                WHERE a.municipio_id = m.id
                AND m.tiene_ac = TRUE
                AND a.priority < 10
            """)
            logger.info(f"Set AC priority for {cur.rowcount} actas")

    return inserted
