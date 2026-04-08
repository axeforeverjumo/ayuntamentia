"""Motor de detección de coherencia interna del partido."""

import logging
from datetime import date, timedelta

from ..config import config
from ..db import get_db, get_cursor
from ..embeddings.generator import search_similar
from ..llm.openclaw_client import analyze_coherence

logger = logging.getLogger(__name__)

LOOKBACK_MONTHS = 6


def check_coherence_for_punto(punto_id: int):
    """Comprueba coherencia para un punto del pleno donde AC participó."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            # Get the punto and its AC vote
            cur.execute("""
                SELECT p.id, p.acta_id, p.municipio_id, p.fecha, p.titulo, p.tema,
                       p.resultado, p.resumen, m.nombre as municipio,
                       v.sentido as ac_voto, v.partido
                FROM puntos_pleno p
                JOIN municipios m ON p.municipio_id = m.id
                JOIN votaciones v ON v.punto_id = p.id
                WHERE p.id = %s
                AND UPPER(v.partido) LIKE %s
            """, (punto_id, f"%{config.PARTY_NAME}%"))

            punto = cur.fetchone()
            if not punto:
                return  # No AC vote in this punto

            # Search for similar puntos in other municipalities
            similar = search_similar(
                query=f"{punto['tema']} {punto['titulo']} {punto['resumen'] or ''}",
                limit=20,
                filters={"tema": punto["tema"]} if punto["tema"] else None,
            )

            # Filter: different municipality, recent, has AC vote
            cutoff = punto["fecha"] - timedelta(days=LOOKBACK_MONTHS * 30) if punto["fecha"] else date.today() - timedelta(days=180)

            for s in similar:
                if s.get("municipio_id") == punto["municipio_id"]:
                    continue
                if s.get("fecha") and s["fecha"] < str(cutoff):
                    continue

                other_punto_id = s["punto_id"]

                # Check if AC voted on this other punto
                cur.execute("""
                    SELECT v.sentido, v.partido, p.titulo, p.resumen, p.resultado,
                           m.nombre as municipio, p.fecha
                    FROM votaciones v
                    JOIN puntos_pleno p ON v.punto_id = p.id
                    JOIN municipios m ON p.municipio_id = m.id
                    WHERE v.punto_id = %s AND UPPER(v.partido) LIKE %s
                """, (other_punto_id, f"%{config.PARTY_NAME}%"))

                other = cur.fetchone()
                if not other:
                    continue

                # Compare votes
                if punto["ac_voto"] == other["sentido"]:
                    continue  # Same vote = coherent

                # Different votes! Use LLM to analyze
                punto_a = {
                    "municipio": punto["municipio"],
                    "fecha": str(punto["fecha"]),
                    "titulo": punto["titulo"],
                    "resumen": punto["resumen"],
                    "voto_ac": punto["ac_voto"],
                    "resultado": punto["resultado"],
                }
                punto_b = {
                    "municipio": other["municipio"],
                    "fecha": str(other["fecha"]),
                    "titulo": other["titulo"],
                    "resumen": other["resumen"],
                    "voto_ac": other["sentido"],
                    "resultado": other["resultado"],
                }

                analysis = analyze_coherence(punto_a, punto_b)

                if not analysis.get("comparable", False):
                    continue

                if analysis.get("coherente", True):
                    continue

                # Create alert
                severidad = analysis.get("severidad", "media")
                cur.execute("""
                    INSERT INTO alertas (tipo, severidad, titulo, descripcion, punto_id, municipio_id, puntos_comparados, contexto)
                    VALUES ('incoherencia_voto', %s, %s, %s, %s, %s, %s, %s)
                """, (
                    severidad,
                    f"Voto contradictorio en {punto['tema'] or 'tema desconocido'}",
                    analysis.get("explicacion", f"AC votó '{punto['ac_voto']}' en {punto['municipio']} pero '{other['sentido']}' en {other['municipio']} sobre tema similar."),
                    punto_id,
                    punto["municipio_id"],
                    [punto_id, other_punto_id],
                    _safe_json({
                        "punto_a": punto_a,
                        "punto_b": punto_b,
                        "analysis": analysis,
                    }),
                ))

                logger.info(f"Alert created: {severidad} incoherencia for punto {punto_id} vs {other_punto_id}")

    # Also check against linea_partido
    _check_against_party_line(punto_id)


def _check_against_party_line(punto_id: int):
    """Compara el voto de AC con la línea oficial del partido."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT p.tema, v.sentido, p.titulo, p.resumen, m.nombre as municipio, p.fecha, p.municipio_id
                FROM puntos_pleno p
                JOIN votaciones v ON v.punto_id = p.id
                JOIN municipios m ON p.municipio_id = m.id
                WHERE p.id = %s AND UPPER(v.partido) LIKE %s
            """, (punto_id, f"%{config.PARTY_NAME}%"))
            punto = cur.fetchone()
            if not punto or not punto["tema"]:
                return

            cur.execute("""
                SELECT posicion, descripcion FROM linea_partido
                WHERE tema = %s
                AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
                ORDER BY vigente_desde DESC LIMIT 1
            """, (punto["tema"],))
            linea = cur.fetchone()
            if not linea:
                return

            if punto["sentido"] != linea["posicion"] and linea["posicion"] != "libre":
                cur.execute("""
                    INSERT INTO alertas (tipo, severidad, titulo, descripcion, punto_id, municipio_id, contexto)
                    VALUES ('contra_linea_partido', 'alta', %s, %s, %s, %s, %s)
                """, (
                    f"Voto contra línea del partido en {punto['tema']}",
                    f"En {punto['municipio']} ({punto['fecha']}), AC votó '{punto['sentido']}' en '{punto['titulo'][:200]}'. "
                    f"La línea del partido es '{linea['posicion']}': {linea['descripcion'] or ''}",
                    punto_id,
                    punto["municipio_id"],
                    _safe_json({"linea": dict(linea), "voto": punto["sentido"]}),
                ))
                logger.info(f"Party line alert for punto {punto_id}")


def _safe_json(data):
    import json
    return json.dumps(data, ensure_ascii=False, default=str)
