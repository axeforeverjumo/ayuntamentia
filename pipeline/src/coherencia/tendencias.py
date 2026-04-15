"""Detector de tendencias emergentes: temas que crecen en plenos y/o redes."""

import logging

from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


def detect_and_alert() -> dict:
    """Genera alertas tipo='tendencia_emergente', 'tendencia_geo' e 'incoherencia_interna'."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("SELECT * FROM v_tendencias_emergentes WHERE delta >= 2 ORDER BY delta DESC LIMIT 10")
            tend = cur.fetchall()
            if not tend:
                # Fallback: els 3 temes més actius (no procedimentals) per tenir senyal visible
                cur.execute("""
                    SELECT tema, actual, previo, delta, pct_crecimiento
                    FROM v_tendencias_emergentes
                    WHERE tema NOT IN ('otros','procedimiento') AND actual >= 5
                    ORDER BY actual DESC LIMIT 3
                """)
                tend = cur.fetchall()

    alertas_creadas = 0
    for t in tend:
        if t['delta'] >= 2:
            titulo = f"Tema emergent: {t['tema']} (+{t['delta']} punts vs mes anterior)"
            descripcion = (
                f"El tema '{t['tema']}' apareix {t['actual']} cops en plens els últims 30 dies "
                f"(vs {t['previo']} els 30 dies anteriors). Creixement {t['pct_crecimiento']}%."
            )
        else:
            titulo = f"Tema actiu: {t['tema']} ({t['actual']} punts aquest mes)"
            descripcion = (
                f"El tema '{t['tema']}' és dels més debatuts ara mateix ({t['actual']} punts en 30 dies). "
                f"Vigilar-lo encara que no creixi."
            )
        with get_db() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """INSERT INTO alertas (tipo, severidad, titulo, descripcion, estado)
                       SELECT 'tendencia_emergente', 'media', %s, %s, 'nueva'
                       WHERE NOT EXISTS (
                         SELECT 1 FROM alertas WHERE tipo='tendencia_emergente'
                         AND titulo=%s AND created_at >= NOW() - INTERVAL '30 days'
                       )""",
                    (titulo, descripcion, titulo),
                )
                if cur.rowcount:
                    alertas_creadas += 1

    geo_alertas = _detect_geo_diffusion()
    incoh = _detect_incoherencia_sql()
    return {"emergentes": len(tend), "alertas_creadas": alertas_creadas, "geo": geo_alertas, "incoherencies": incoh}


def _detect_incoherencia_sql() -> int:
    """Detecta partits que voten diferent sobre el mateix tema en municipis diferents (SQL pur, sense LLM)."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                WITH votos AS (
                    SELECT v.partido, p.tema, v.sentido, p.municipio_id, p.id AS punto_id, p.fecha
                    FROM votaciones v
                    JOIN puntos_pleno p ON p.id = v.punto_id
                    WHERE p.fecha >= CURRENT_DATE - INTERVAL '90 days'
                      AND v.sentido IN ('favor','contra')
                      AND p.tema IS NOT NULL
                      AND p.tema NOT IN ('otros','procedimiento')
                )
                SELECT partido, tema,
                       COUNT(DISTINCT CASE WHEN sentido='favor' THEN municipio_id END) AS muns_favor,
                       COUNT(DISTINCT CASE WHEN sentido='contra' THEN municipio_id END) AS muns_contra
                FROM votos
                GROUP BY partido, tema
                HAVING COUNT(DISTINCT CASE WHEN sentido='favor' THEN municipio_id END) >= 1
                   AND COUNT(DISTINCT CASE WHEN sentido='contra' THEN municipio_id END) >= 1
                ORDER BY (muns_favor + muns_contra) DESC
                LIMIT 10
            """)
            rows = cur.fetchall()
    n = 0
    for r in rows:
        titulo = f"Incoherència {r['partido']} sobre {r['tema']}"
        descripcion = (
            f"{r['partido']} ha votat A FAVOR en {r['muns_favor']} municipis i EN CONTRA en "
            f"{r['muns_contra']} municipis sobre '{r['tema']}' els últims 90 dies."
        )
        with get_db() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """INSERT INTO alertas (tipo, severidad, titulo, descripcion, estado)
                       SELECT 'incoherencia_interna', 'media', %s, %s, 'nueva'
                       WHERE NOT EXISTS (
                         SELECT 1 FROM alertas WHERE tipo='incoherencia_interna'
                         AND titulo=%s AND created_at >= NOW() - INTERVAL '30 days'
                       )""",
                    (titulo, descripcion, titulo),
                )
                if cur.rowcount:
                    n += 1
    return n


def _detect_geo_diffusion() -> int:
    """Detecta temas que en 30 días saltaron de 1 comarca a 3+."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                WITH actual AS (
                    SELECT p.tema, COUNT(DISTINCT m.comarca) AS comarcas_recientes
                    FROM puntos_pleno p JOIN municipios m ON m.id = p.municipio_id
                    WHERE p.fecha >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY p.tema
                ), previo AS (
                    SELECT p.tema, COUNT(DISTINCT m.comarca) AS comarcas_previas
                    FROM puntos_pleno p JOIN municipios m ON m.id = p.municipio_id
                    WHERE p.fecha BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY p.tema
                )
                SELECT a.tema, a.comarcas_recientes, COALESCE(p.comarcas_previas, 0) AS prev
                FROM actual a LEFT JOIN previo p USING (tema)
                WHERE a.comarcas_recientes >= 3 AND COALESCE(p.comarcas_previas, 0) <= 1
            """)
            rows = cur.fetchall()
    n = 0
    for r in rows:
        titulo = f"Tema {r['tema']} salta a {r['comarcas_recientes']} comarques"
        with get_db() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """INSERT INTO alertas (tipo, severidad, titulo, descripcion, estado)
                       SELECT 'tendencia_geo', 'alta', %s,
                              %s, 'nueva'
                       WHERE NOT EXISTS (
                         SELECT 1 FROM alertas WHERE tipo='tendencia_geo' AND titulo=%s
                         AND created_at >= NOW() - INTERVAL '30 days'
                       )""",
                    (titulo,
                     f"De {r['prev']} comarques a {r['comarcas_recientes']} en 30 dies. Possible tendència nacional emergent.",
                     titulo),
                )
                if cur.rowcount:
                    n += 1
    return n
