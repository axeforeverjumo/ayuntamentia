"""Endpoints de inteligencia: ranking concejales, tendencias, promesas incumplidas."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from ..db import get_db
from ..services import PremsaRetrievalFilters, RetrievalContext, intelligence_retrieval_service

logger = logging.getLogger(__name__)
router = APIRouter()


class IntelligenceRetrievalRequest(BaseModel):
    query: str = Field(min_length=3)
    tenant: Optional[str] = None
    municipio: Optional[str] = None
    comarca: Optional[str] = None
    partido: Optional[str] = None
    limit_per_source: int = Field(default=5, ge=1, le=10)
    temes: list[str] = Field(default_factory=list)
    partits: list[str] = Field(default_factory=list)
    sentiment: Optional[str] = Field(default=None, pattern="^(positiu|negatiu|neutre)$")
    date_from: Optional[str] = None
    date_to: Optional[str] = None


def _partido_filter(partido: str):
    """Build SQL WHERE clause for partido matching.

    For short codes like 'AC', uses word-boundary regex to avoid
    matching ACSENT, ACTIVEMUIB, CACTUA, etc.
    Also matches ALIANÇA.CAT and known coalition patterns.
    """
    if partido.upper() == "AC":
        return (
            "(partido ~* %s OR partido ILIKE %s OR partido ILIKE %s)",
            [r"\mAC\M", "%ALIANÇA%", "%ALIAN%"],
        )
    return (
        "partido ~* %s",
        [rf"\m{partido}\M"],
    )


@router.post("/retrieval")
async def retrieval(payload: IntelligenceRetrievalRequest):
    context = RetrievalContext(
        tenant=payload.tenant,
        municipio=payload.municipio,
        comarca=payload.comarca,
        partido=payload.partido,
        limit_per_source=payload.limit_per_source,
        premsa_filters=PremsaRetrievalFilters(
            temes=payload.temes,
            partits=payload.partits,
            sentiment=payload.sentiment,
            date_from=payload.date_from,
            date_to=payload.date_to,
        ),
    )
    try:
        return await intelligence_retrieval_service.dual_retrieve(payload.query, context)
    except Exception as exc:
        logger.exception("intel_retrieval.endpoint_failed query=%r", payload.query)
        raise HTTPException(status_code=503, detail="intel_retrieval_unavailable") from exc


@router.get("/ranking-concejales")
def ranking(
    partido: Optional[str] = None,
    municipio: Optional[str] = None,
    order: str = Query("divergencia", regex="^(divergencia|alineacion)$"),
    limit: int = Query(50, le=200),
):
    where, params = ["votos_total >= 1"], []
    if partido:
        clause, pvals = _partido_filter(partido)
        where.append(clause)
        params.extend(pvals)
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
        rows = cur.fetchall()

        if partido:
            existing_names = {r["nombre"] for r in rows}
            clause, pvals = _partido_filter(partido)
            cur.execute(f"""
                SELECT DISTINCT ON (c.nombre) c.nombre, c.cargo,
                       c.partido, m.nombre AS municipio, m.comarca,
                       0 AS votos_total, 0 AS coincidentes, 0 AS divergencias,
                       NULL::numeric AS pct_alineacion
                FROM cargos_electos c
                JOIN municipios m ON m.id = c.municipio_id
                WHERE c.activo = true
                  AND {clause}
                ORDER BY c.nombre, c.id DESC
                LIMIT %s
            """, pvals + [limit])
            for r in cur.fetchall():
                if r["nombre"] not in existing_names:
                    rows.append(r)
                    existing_names.add(r["nombre"])

        return rows


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
