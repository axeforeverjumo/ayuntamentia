"""Detector de tendencias emergentes: temas que crecen en plenos y/o redes."""

import logging

from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


def detect_and_alert() -> dict:
    """Genera alertas tipo='tendencia_emergente' y 'tendencia_geo'."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("SELECT * FROM v_tendencias_emergentes WHERE delta >= 5 ORDER BY delta DESC LIMIT 10")
            tend = cur.fetchall()

    alertas_creadas = 0
    for t in tend:
        titulo = f"Tema emergent: {t['tema']} (+{t['delta']} punts vs mes anterior)"
        descripcion = (
            f"El tema '{t['tema']}' apareix {t['actual']} cops en plens els últims 30 dies "
            f"(vs {t['previo']} els 30 dies anteriors). Creixement {t['pct_crecimiento']}%."
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
    return {"emergentes": len(tend), "alertas_creadas": alertas_creadas, "geo": geo_alertas}


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
