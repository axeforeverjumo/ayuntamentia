"""Estructuración de actas usando LLM via OpenClaw."""

import json
import logging

from ..config import config
from ..db import get_db, get_cursor
from .openclaw_client import extract_structured

logger = logging.getLogger(__name__)


def process_structuring(acta_id: int):
    """Estructura un acta extraída usando GPT-5.4-mini."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id, texto, municipio_id, codi_ens, fecha FROM actas WHERE id = %s AND status = 'extracted'",
                (acta_id,)
            )
            acta = cur.fetchone()
            if not acta or not acta["texto"]:
                return False

            try:
                result = extract_structured(acta["texto"])

                if "error" in result:
                    cur.execute("""
                        UPDATE actas SET status = 'failed_structuring', error_message = %s, retry_count = retry_count + 1
                        WHERE id = %s
                    """, (result.get("error", "unknown")[:500], acta_id))
                    return False

                # Save full analysis
                cur.execute("""
                    INSERT INTO actas_analisis (acta_id, datos_completos, modelo_usado, procesado_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (acta_id) DO UPDATE SET datos_completos = EXCLUDED.datos_completos, procesado_at = NOW()
                """, (acta_id, json.dumps(result, ensure_ascii=False), config.OPENCLAW_MODEL_MINI))

                # Extract and save puntos del pleno
                for punto in result.get("puntos_orden_dia", []):
                    votacion = punto.get("votacion", {})
                    cur.execute("""
                        INSERT INTO puntos_pleno (acta_id, municipio_id, fecha, numero, titulo, tema, resultado, resumen, unanimidad)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        acta_id,
                        acta["municipio_id"],
                        acta["fecha"],
                        punto.get("numero"),
                        punto.get("titulo", "Sin título"),
                        punto.get("tema"),
                        punto.get("resultado"),
                        punto.get("resumen"),
                        votacion.get("unanimidad", False),
                    ))
                    punto_id = cur.fetchone()["id"]

                    # Save votaciones by partido
                    for sentido_key, sentido_val in [("a_favor", "a_favor"), ("en_contra", "en_contra"), ("abstenciones", "abstencion")]:
                        partidos = votacion.get(sentido_key, [])
                        if isinstance(partidos, list):
                            for partido in partidos:
                                if isinstance(partido, str):
                                    # Try to match cargo_electo
                                    cur.execute("""
                                        SELECT id FROM cargos_electos
                                        WHERE municipio_id = %s AND partido ILIKE %s AND activo = TRUE
                                        LIMIT 1
                                    """, (acta["municipio_id"], f"%{partido}%"))
                                    cargo = cur.fetchone()

                                    cur.execute("""
                                        INSERT INTO votaciones (punto_id, cargo_electo_id, partido, sentido)
                                        VALUES (%s, %s, %s, %s)
                                    """, (punto_id, cargo["id"] if cargo else None, partido, sentido_val))

                    # Save argumentos
                    for arg in punto.get("argumentos", []):
                        if isinstance(arg, dict) and arg.get("argumento"):
                            cur.execute("""
                                INSERT INTO argumentos (punto_id, partido, posicion, argumento)
                                VALUES (%s, %s, %s, %s)
                            """, (punto_id, arg.get("partido"), arg.get("posicion"), arg["argumento"]))

                # Save ruegos y preguntas as special puntos
                for ruego in result.get("ruegos_preguntas", []):
                    if isinstance(ruego, dict):
                        cur.execute("""
                            INSERT INTO puntos_pleno (acta_id, municipio_id, fecha, titulo, tema, resultado, resumen)
                            VALUES (%s, %s, %s, %s, %s, 'informativo', %s)
                        """, (
                            acta_id, acta["municipio_id"], acta["fecha"],
                            f"Ruego/Pregunta: {ruego.get('contenido', '')[:200]}",
                            ruego.get("tema", "ruegos"),
                            ruego.get("contenido"),
                        ))

                # Update acta status
                cur.execute("""
                    UPDATE actas SET status = 'structured', structured_at = NOW(), quality_score = %s
                    WHERE id = %s
                """, (_calc_quality(result), acta_id))

                logger.info(f"Structured acta {acta_id}: {len(result.get('puntos_orden_dia', []))} puntos")
                return True

            except Exception as e:
                logger.error(f"Structuring failed for acta {acta_id}: {e}")
                cur.execute("""
                    UPDATE actas SET status = 'failed_structuring', error_message = %s, retry_count = retry_count + 1
                    WHERE id = %s
                """, (str(e)[:500], acta_id))
                return False


def _calc_quality(result: dict) -> int:
    """Calcula quality_score 0-100 basado en completitud de la extracción."""
    score = 0
    puntos = result.get("puntos_orden_dia", [])

    if puntos:
        score += 20
    if any(p.get("votacion", {}).get("a_favor") for p in puntos):
        score += 30
    if any(p.get("argumentos") for p in puntos):
        score += 20
    if result.get("asistentes"):
        score += 15
    if result.get("sesion", {}).get("fecha"):
        score += 15

    return min(score, 100)
