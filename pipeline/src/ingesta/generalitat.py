"""Ingesta de datasets extra de la Generalitat via Socrata API."""

import logging
import httpx
from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)

BASE = "https://analisi.transparenciacatalunya.cat/resource"


def _fetch_all(dataset_id: str, params: dict = None, max_records: int = 50000) -> list[dict]:
    all_records = []
    offset = 0
    limit = 5000
    while offset < max_records:
        p = {"$limit": limit, "$offset": offset}
        if params:
            p.update(params)
        resp = httpx.get(f"{BASE}/{dataset_id}.json", params=p, timeout=60)
        resp.raise_for_status()
        records = resp.json()
        if not records:
            break
        all_records.extend(records)
        offset += limit
        if len(records) < limit:
            break
    return all_records


def sync_elecciones():
    """Elecciones municipales — votos por partido desde 1979."""
    logger.info("Fetching elecciones municipales...")
    records = _fetch_all("vq27-2ky2", max_records=40000)
    logger.info(f"Fetched {len(records)} registros electorales")

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("TRUNCATE elecciones")
            for r in records:
                try:
                    cur.execute("""
                        INSERT INTO elecciones (codi_ens, municipio, anyo, partido, votos, porcentaje, concejales)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        str(r.get("codi_ens", "")),
                        r.get("municipi", ""),
                        int(r["any_eleccio"]) if r.get("any_eleccio") else None,
                        r.get("sigles_candidatura", ""),
                        int(r["vots"]) if r.get("vots") and str(r["vots"]).replace("-","").isdigit() else None,
                        float(r["vots_1"]) if r.get("vots_1") else None,
                        int(r["regidors"]) if r.get("regidors") and str(r["regidors"]).isdigit() else None,
                    ))
                except Exception as e:
                    logger.debug(f"Skip eleccion: {e}")
    logger.info(f"Elecciones sync done: {len(records)}")
    return len(records)


def sync_alcaldes():
    """Historial de alcaldes desde 1979."""
    logger.info("Fetching historial alcaldes...")
    records = _fetch_all("2v2p-vu4h", max_records=15000)
    logger.info(f"Fetched {len(records)} alcaldes")

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("TRUNCATE alcaldes")
            for r in records:
                fecha = r.get("data_pressa_possessio", "")[:10] if r.get("data_pressa_possessio") else None
                cur.execute("""
                    INSERT INTO alcaldes (codi_ens, municipio, nombre, partido, legislatura, fecha_posesion)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    str(r.get("codi_10", "")),
                    r.get("nom_ens", ""),
                    r.get("nom_alcalde", ""),
                    r.get("partit_alcalde", ""),
                    r.get("legislatura_alcalde", ""),
                    fecha,
                ))
    logger.info(f"Alcaldes sync done: {len(records)}")
    return len(records)


def sync_mociones():
    """Mociones municipales al Govern."""
    logger.info("Fetching mociones al Govern...")
    records = _fetch_all("7jhe-9adf", max_records=5000)
    logger.info(f"Fetched {len(records)} mociones")

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("TRUNCATE mociones")
            for r in records:
                fecha = r.get("data", "")[:10] if r.get("data") else None
                cur.execute("""
                    INSERT INTO mociones (titulo, municipio, vegueria, fecha, tema)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    r.get("titol", ""),
                    r.get("ens", ""),
                    r.get("vegueria", ""),
                    fecha,
                    r.get("tema", ""),
                ))
    logger.info(f"Mociones sync done: {len(records)}")
    return len(records)


def sync_poblacion():
    """Población histórica por municipio."""
    logger.info("Fetching población histórica...")
    records = _fetch_all("x5sz-niat", max_records=40000)
    logger.info(f"Fetched {len(records)} registros población")

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("TRUNCATE poblacion")
            for r in records:
                cur.execute("""
                    INSERT INTO poblacion (codi_ens, municipio, anyo, total, hombres, mujeres)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    str(r.get("codi_10", "")),
                    r.get("nom_ens", ""),
                    int(r["any"]) if r.get("any") and str(r["any"]).isdigit() else None,
                    int(r["total"]) if r.get("total") and str(r["total"]).isdigit() else None,
                    int(r["homes"]) if r.get("homes") and str(r["homes"]).isdigit() else None,
                    int(r["dones"]) if r.get("dones") and str(r["dones"]).isdigit() else None,
                ))
    logger.info(f"Población sync done: {len(records)}")
    return len(records)


def sync_presupuestos():
    """Presupuestos municipales — resumen por municipio/año."""
    logger.info("Fetching presupuestos (resumen)...")
    # Solo ingresos totales por municipio/año (no las 7.9M líneas)
    records = _fetch_all("4g9s-gzp6", params={
        "$select": "codi_ens,nom_complert,any_exercici,tipus_partida,SUM(import) as total",
        "$group": "codi_ens,nom_complert,any_exercici,tipus_partida",
        "$where": "nivell='1'",
    }, max_records=50000)
    logger.info(f"Fetched {len(records)} resúmenes presupuesto")

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("TRUNCATE presupuestos")
            for r in records:
                try:
                    cur.execute("""
                        INSERT INTO presupuestos (codi_ens, municipio, anyo, tipo, total)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        str(r.get("codi_ens", "")),
                        r.get("nom_complert", ""),
                        int(r["any_exercici"]) if r.get("any_exercici") else None,
                        r.get("tipus_partida", ""),
                        float(r["total"]) if r.get("total") else 0,
                    ))
                except Exception as e:
                    logger.debug(f"Skip presupuesto: {e}")
    logger.info(f"Presupuestos sync done: {len(records)}")
    return len(records)


def sync_iniciativas():
    """Iniciativas parlamentarias."""
    logger.info("Fetching iniciativas parlamentarias...")
    # Solo las últimas 3 legislaturas
    records = _fetch_all("4zau-4u5s", params={"$where": "legislatura >= '13'"}, max_records=30000)
    logger.info(f"Fetched {len(records)} iniciativas")

    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("TRUNCATE iniciativas_parlament")
            for r in records:
                fecha = r.get("data_publicaci_bopc", "")[:10] if r.get("data_publicaci_bopc") else None
                url = r.get("link_parlament", {}).get("url", "") if isinstance(r.get("link_parlament"), dict) else ""
                cur.execute("""
                    INSERT INTO iniciativas_parlament (legislatura, tipo, numero, titulo, proponentes, grupo, fecha, url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    r.get("legislatura", ""),
                    r.get("tipus_iniciativa", ""),
                    r.get("n_m_iniciativa", ""),
                    r.get("t_tol_original", ""),
                    r.get("proponents", ""),
                    r.get("descripci_curta", ""),
                    fecha,
                    url,
                ))
    logger.info(f"Iniciativas sync done: {len(records)}")
    return len(records)


def sync_all_extra():
    """Sincroniza todos los datasets extra."""
    results = {}
    for name, fn in [
        ("elecciones", sync_elecciones),
        ("alcaldes", sync_alcaldes),
        ("mociones", sync_mociones),
        ("poblacion", sync_poblacion),
        ("presupuestos", sync_presupuestos),
        ("iniciativas", sync_iniciativas),
    ]:
        try:
            results[name] = fn()
        except Exception as e:
            logger.error(f"Failed to sync {name}: {e}")
            results[name] = f"ERROR: {e}"
    return results
