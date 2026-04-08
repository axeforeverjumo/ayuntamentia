"""Cliente para la API Socrata de Municat — cargos electos y datos de entes."""

import json
import logging

import httpx
from psycopg2.extras import Json

from ..config import config
from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


def fetch_socrata(dataset_id: str, params: dict | None = None) -> list[dict]:
    """Fetch all records from a Socrata dataset with pagination."""
    base_url = f"{config.SOCRATA_BASE_URL}/resource/{dataset_id}.json"
    all_records = []
    offset = 0
    limit = 5000

    while True:
        query_params = {"$limit": limit, "$offset": offset}
        if params:
            query_params.update(params)

        resp = httpx.get(base_url, params=query_params, timeout=60)
        resp.raise_for_status()
        records = resp.json()

        if not records:
            break

        all_records.extend(records)
        offset += limit

        if len(records) < limit:
            break

    return all_records


def sync_municipios():
    """Descarga datos de todos los municipios desde Socrata y los inserta en DB."""
    logger.info("Fetching municipios from Socrata...")
    records = fetch_socrata(
        config.SOCRATA_ENTES_DATASET,
        {"$where": "nomtipus='Municipis'", "$limit": 2000}
    )
    logger.info(f"Fetched {len(records)} municipios")

    inserted = 0
    with get_db() as conn:
        with get_cursor(conn) as cur:
            for rec in records:
                codi = rec.get("codi_ens", rec.get("codi_10", ""))
                nombre = rec.get("nom_complert", rec.get("nom_ens", ""))
                if not codi or not nombre:
                    continue

                def _str(v):
                    """Safely convert any value to str."""
                    if v is None:
                        return ""
                    if isinstance(v, dict):
                        return str(v.get("url", v.get("value", str(v))))
                    return str(v)

                pob = rec.get("cens")
                pob_int = None
                if pob and not isinstance(pob, dict):
                    try:
                        pob_int = int(pob)
                    except (ValueError, TypeError):
                        pass

                cur.execute("""
                    INSERT INTO municipios (codi_ens, nombre, nombre_oficial, comarca, provincia, poblacion, url_sede, external_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (codi_ens) DO UPDATE SET
                        nombre = EXCLUDED.nombre,
                        comarca = EXCLUDED.comarca,
                        provincia = EXCLUDED.provincia,
                        poblacion = EXCLUDED.poblacion,
                        updated_at = NOW()
                """, (
                    str(codi),
                    _str(nombre),
                    _str(rec.get("nom_curt", nombre)),
                    _str(rec.get("comarca", "")),
                    _str(rec.get("provincia", "")),
                    pob_int,
                    _str(rec.get("municat", "")),
                    Json(rec),
                ))
                if cur.rowcount > 0:
                    inserted += 1

    logger.info(f"Upserted {inserted} municipios")
    return inserted


def sync_cargos_electos():
    """Descarga cargos electos desde Socrata y los inserta en DB."""
    logger.info("Fetching cargos electos from Socrata...")
    records = fetch_socrata(
        config.SOCRATA_CARGOS_DATASET,
        {"$where": "tipus_ens='Municipis'", "$limit": 15000}
    )
    logger.info(f"Fetched {len(records)} cargos electos")

    inserted = 0
    ac_municipios = set()

    with get_db() as conn:
        with get_cursor(conn) as cur:
            # Clear existing and reload
            cur.execute("UPDATE cargos_electos SET activo = FALSE")

            for rec in records:
                codi = str(rec.get("codi_10", rec.get("codi_ens", "")))
                nombre = rec.get("nom", "")
                partido = rec.get("partit_politic", "")
                if not codi or not nombre:
                    continue

                # Get municipio_id
                cur.execute("SELECT id FROM municipios WHERE codi_ens = %s", (codi,))
                mun = cur.fetchone()
                municipio_id = mun["id"] if mun else None

                cur.execute("""
                    INSERT INTO cargos_electos (municipio_id, codi_ens, nombre, cargo, partido, area, orden, fecha_nombramiento, activo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    ON CONFLICT DO NOTHING
                """, (
                    municipio_id,
                    codi,
                    nombre,
                    rec.get("carrec", ""),
                    partido,
                    rec.get("area", ""),
                    int(rec.get("ordre", 0)) if rec.get("ordre") else None,
                    rec.get("data_nomenament"),
                ))
                if cur.rowcount > 0:
                    inserted += 1

                # Track AC municipalities
                if config.PARTY_NAME.lower() in partido.lower():
                    ac_municipios.add(codi)

            # Mark AC municipalities
            if ac_municipios:
                cur.execute(
                    "UPDATE municipios SET tiene_ac = TRUE WHERE codi_ens = ANY(%s)",
                    (list(ac_municipios),)
                )
                logger.info(f"Marked {len(ac_municipios)} municipios with AC presence")

    logger.info(f"Inserted {inserted} cargos electos")
    return inserted


def sync_all():
    """Sincroniza todo: municipios + cargos electos."""
    m = sync_municipios()
    c = sync_cargos_electos()
    return {"municipios": m, "cargos": c}
