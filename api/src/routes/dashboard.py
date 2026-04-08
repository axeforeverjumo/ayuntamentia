from fastapi import APIRouter
from ..db import get_cursor

router = APIRouter()


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


@router.get("/temas")
def get_temas_trending():
    with get_cursor() as cur:
        # Show all temas from processed actas (not just last 30 days)
        cur.execute("""
            SELECT tema, COUNT(*) as count
            FROM puntos_pleno
            WHERE tema IS NOT NULL AND tema != 'procedimiento'
            GROUP BY tema ORDER BY count DESC LIMIT 10
        """)
        return cur.fetchall()


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
            ORDER BY a.structured_at DESC LIMIT 20
        """)
        return cur.fetchall()
