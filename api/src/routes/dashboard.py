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
        # Strategic trend score = weighted mentions + normalized media level.
        # This query keeps backward compatibility when media signals are still null.
        cur.execute("""
            WITH tema_actas AS (
                SELECT
                    LOWER(TRIM(tema)) AS tema,
                    COUNT(*)::float AS actas_menciones
                FROM puntos_pleno
                WHERE tema IS NOT NULL
                  AND TRIM(tema) != ''
                  AND LOWER(TRIM(tema)) != 'procedimiento'
                GROUP BY LOWER(TRIM(tema))
            ),
            tema_media AS (
                SELECT
                    ta.tema,
                    ta.actas_menciones,
                    COALESCE(t.nivel_mediatico_prensa, 0)::float AS media_prensa,
                    COALESCE(t.nivel_mediatico_redes, 0)::float AS media_redes,
                    COALESCE(t.nivel_mediatico_otras, 0)::float AS media_otras
                FROM tema_actas ta
                LEFT JOIN temas_trend_signals t ON t.tema = ta.tema
            ),
            maxima AS (
                SELECT
                    GREATEST(MAX(actas_menciones), 1) AS max_actas,
                    GREATEST(MAX(media_prensa), 1) AS max_prensa,
                    GREATEST(MAX(media_redes), 1) AS max_redes,
                    GREATEST(MAX(media_otras), 1) AS max_otras
                FROM tema_media
            )
            SELECT
                tm.tema,
                ROUND(tm.actas_menciones)::int AS count,
                ROUND(
                    (
                        0.45 * (tm.actas_menciones / m.max_actas) +
                        0.30 * (tm.media_prensa / m.max_prensa) +
                        0.20 * (tm.media_redes / m.max_redes) +
                        0.05 * (tm.media_otras / m.max_otras)
                    ) * 100,
                    2
                ) AS trend_score,
                ROUND((tm.media_prensa / m.max_prensa) * 100, 2) AS media_prensa_norm,
                ROUND((tm.media_redes / m.max_redes) * 100, 2) AS media_redes_norm,
                ROUND((tm.media_otras / m.max_otras) * 100, 2) AS media_otras_norm
            FROM tema_media tm
            CROSS JOIN maxima m
            ORDER BY trend_score DESC, tm.actas_menciones DESC
            LIMIT 10
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
            ORDER BY a.fecha DESC LIMIT 20
        """)
        return cur.fetchall()
