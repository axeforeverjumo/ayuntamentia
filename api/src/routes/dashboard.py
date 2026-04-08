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
        cur.execute("""
            SELECT tema, COUNT(*) as count
            FROM puntos_pleno
            WHERE fecha >= CURRENT_DATE - INTERVAL '30 days' AND tema IS NOT NULL
            GROUP BY tema ORDER BY count DESC LIMIT 10
        """)
        return cur.fetchall()


@router.get("/coherencia")
def get_coherencia_overview():
    with get_cursor() as cur:
        cur.execute("SELECT * FROM coherencia_concejales ORDER BY indice_coherencia ASC LIMIT 20")
        return cur.fetchall()


@router.get("/actividad-reciente")
def get_actividad_reciente():
    with get_cursor() as cur:
        cur.execute("""
            SELECT a.id, a.fecha, a.tipo, m.nombre as municipio,
                   COUNT(DISTINCT p.id) as num_puntos,
                   COUNT(DISTINCT al.id) as num_alertas
            FROM actas a
            JOIN municipios m ON a.municipio_id = m.id
            LEFT JOIN puntos_pleno p ON p.acta_id = a.id
            LEFT JOIN alertas al ON al.punto_id = p.id AND al.estado = 'nueva'
            WHERE a.status = 'structured'
            GROUP BY a.id, a.fecha, a.tipo, m.nombre
            ORDER BY a.fecha DESC LIMIT 20
        """)
        return cur.fetchall()
