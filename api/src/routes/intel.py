"""Endpoints de inteligencia: ranking concejales, tendencias, promesas incumplidas."""

from typing import Optional
from fastapi import APIRouter, Query
from psycopg2.extras import RealDictCursor

from ..db import get_db

router = APIRouter()


@router.get("/ranking-concejales")
def ranking(
    partido: Optional[str] = None,
    municipio: Optional[str] = None,
    order: str = Query("divergencia", regex="^(divergencia|alineacion)$"),
    limit: int = Query(50, le=200),
):
    where, params = ["votos_total >= 1"], []
    if partido:
        where.append("(partido ILIKE %s OR partido ILIKE %s)")
        params.extend([f"%{partido}%", f"{partido}-%"])
    if municipio:
        where.append("LOWER(municipio) ILIKE LOWER(%s)")
        params.append(f"%{municipio}%")
    order_sql = "pct_alineacion ASC" if order == "divergencia" else "pct_alineacion DESC"
    sql = f"""SELECT nombre, cargo, partido, municipio, comarca,
                     votos_total, coincidentes, divergencias, pct_alineacion
              FROM v_ranking_concejales WHERE {' AND '.join(where)}
              ORDER BY {order_sql} LIMIT %s"""
    params.append(limit)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/tendencias")
def tendencias(
    limit: int = Query(30, le=100),
):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM v_tendencias_emergentes LIMIT %s", (limit,))
        return cur.fetchall()


@router.get("/promesas-incumplidas")
def promesas_incumplidas(
    partido: Optional[str] = None,
    limit: int = Query(50, le=200),
):
    """Cruce: puntos propuestos por el partido X en el Parlament que luego fueron
    rechazados en los municipios donde ese partido gobierna."""
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sql = """
            SELECT pp.tema, pp.partido_proponente AS partido_parlament,
                   COUNT(*) FILTER (WHERE pm.resultado = 'rechazada') AS rechazadas,
                   COUNT(*) FILTER (WHERE pm.resultado = 'aprobada') AS aprobadas,
                   array_agg(DISTINCT m.nombre) FILTER (WHERE pm.resultado = 'rechazada') AS municipios_contradictores
            FROM puntos_pleno pp
            LEFT JOIN puntos_pleno pm
              ON pm.tema = pp.tema AND pm.nivel = 'municipal'
              AND pm.fecha BETWEEN pp.fecha - INTERVAL '180 days' AND pp.fecha + INTERVAL '180 days'
            LEFT JOIN municipios m ON m.id = pm.municipio_id
            WHERE pp.nivel = 'parlament' AND pp.partido_proponente IS NOT NULL
        """
        params = []
        if partido:
            sql += " AND pp.partido_proponente ILIKE %s"
            params.append(f"%{partido}%")
        sql += " GROUP BY pp.tema, pp.partido_proponente HAVING COUNT(*) FILTER (WHERE pm.resultado='rechazada') > 0 ORDER BY rechazadas DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        return cur.fetchall()
