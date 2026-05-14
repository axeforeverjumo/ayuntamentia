from typing import Optional

from fastapi import APIRouter, Depends
from psycopg2 import errors
from pydantic import BaseModel

from ..auth import CurrentUser, get_current_user
from ..db import get_cursor
from ..services.dashboard_service import dashboard_service

router = APIRouter()


class TendenciaScoreDetails(BaseModel):
    trending_score: Optional[float] = None
    base_score: Optional[float] = None
    delta_plens: Optional[float] = None
    score_premsa: Optional[float] = None
    score_xarxes: Optional[float] = None
    penalty_applied: Optional[float] = None
    calculated_at: Optional[str] = None


class TendenciaItem(BaseModel):
    tema: str
    count: int
    trending_score: Optional[float] = None
    score: Optional[TendenciaScoreDetails] = None


@router.get("/")
def get_dashboard(user: CurrentUser = Depends(get_current_user)):
    return dashboard_service.get_dashboard_payload(user)


@router.get("/stats")
def get_stats():
    with get_cursor() as cur:
        cur.execute("SELECT * FROM dashboard_stats")
        return cur.fetchone()


@router.get("/pipeline")
def get_pipeline_status():
    with get_cursor() as cur:
        cur.execute("""
            SELECT status, COUNT(*) as count
            FROM actas GROUP BY status ORDER BY count DESC
        """)
        return {"pipeline": cur.fetchall()}


@router.get("/temas", response_model=list[TendenciaItem])
def get_temas_trending():
    try:
        return dashboard_service.list_tendencias()
    except errors.UndefinedTable:
        return []


@router.get("/coherencia")
def get_coherencia_overview():
    with get_cursor() as cur:
        # Only show AC concejales or those with actual votaciones
        cur.execute("""
            SELECT * FROM coherencia_concejales
            WHERE UPPER(partido) LIKE '%ALIAN%' OR UPPER(partido) LIKE '%AC%'
            ORDER BY indice_coherencia ASC
            LIMIT 20
        """)
        result = cur.fetchall()
        if not result:
            # Fallback: show concejales with most votaciones
            cur.execute("""
                SELECT * FROM coherencia_concejales
                WHERE total_votaciones > 0
                ORDER BY total_votaciones DESC
                LIMIT 10
            """)
            result = cur.fetchall()
        return result


@router.get("/actividad-reciente")
def get_actividad_reciente():
    with get_cursor() as cur:
        cur.execute("""
            SELECT a.id, a.fecha, a.tipo, m.nombre as municipio,
                   a.quality_score,
                   COUNT(DISTINCT p.id) as num_puntos,
                   COUNT(DISTINCT al.id) as num_alertas
            FROM actas a
            JOIN municipios m ON a.municipio_id = m.id
            LEFT JOIN puntos_pleno p ON p.acta_id = a.id
            LEFT JOIN alertas al ON al.punto_id = p.id AND al.estado = 'nueva'
            WHERE a.status = 'structured'
            GROUP BY a.id, a.fecha, a.tipo, m.nombre, a.quality_score
            ORDER BY a.fecha DESC LIMIT 20
        """)
        return cur.fetchall()
