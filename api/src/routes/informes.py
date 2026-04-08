from fastapi import APIRouter
from ..db import get_cursor

router = APIRouter()


@router.get("/semanal")
def get_latest_report():
    """Devuelve stats para generar informe semanal."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) as actas_semana FROM actas
            WHERE fecha >= CURRENT_DATE - INTERVAL '7 days' AND status = 'structured'
        """)
        actas = cur.fetchone()

        cur.execute("""
            SELECT tema, COUNT(*) as n FROM puntos_pleno
            WHERE fecha >= CURRENT_DATE - INTERVAL '7 days' AND tema IS NOT NULL
            GROUP BY tema ORDER BY n DESC LIMIT 10
        """)
        temas = cur.fetchall()

        cur.execute("""
            SELECT severidad, COUNT(*) as n FROM alertas
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY severidad
        """)
        alertas = cur.fetchall()

        cur.execute("""
            SELECT * FROM coherencia_concejales
            WHERE partido ILIKE '%ALIANÇA%' OR partido ILIKE '%AC%'
            ORDER BY indice_coherencia ASC LIMIT 10
        """)
        coherencia = cur.fetchall()

        return {
            "actas_semana": actas,
            "temas": temas,
            "alertas": alertas,
            "coherencia": coherencia,
        }
