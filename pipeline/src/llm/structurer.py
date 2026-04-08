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

                if not isinstance(result, dict) or "error" in result:
                    err = result.get("error", "unknown") if isinstance(result, dict) else str(result)[:500]
                    cur.execute("""
                        UPDATE actas SET status = 'failed_structuring', error_message = %s, retry_count = retry_count + 1
                        WHERE id = %s
                    """, (str(err)[:500], acta_id))
                    return False

                # Save full analysis
                cur.execute("""
                    INSERT INTO actas_analisis (acta_id, datos_completos, modelo_usado, procesado_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (acta_id) DO UPDATE SET datos_completos = EXCLUDED.datos_completos, procesado_at = NOW()
                """, (acta_id, json.dumps(result, ensure_ascii=False), config.OPENCLAW_MODEL_MINI))

                # Extract puntos - try multiple field names the LLM might use
                puntos_raw = (
                    result.get("puntos_orden_dia")
                    or result.get("puntos")
                    or result.get("orden_del_dia")
                    or result.get("punts")
                    or []
                )
                if not isinstance(puntos_raw, list):
                    puntos_raw = []

                for punto in puntos_raw:
                    if not isinstance(punto, dict):
                        continue

                    votacion = punto.get("votacion") or punto.get("votacio") or {}
                    if not isinstance(votacion, dict):
                        votacion = {}

                    titulo = punto.get("titulo") or punto.get("titol") or punto.get("title") or "Sense títol"
                    tema = punto.get("tema") or punto.get("category") or None
                    resultado = punto.get("resultado") or punto.get("resultat") or votacion.get("resultado") or None
                    resumen = punto.get("resumen") or punto.get("resum") or None
                    unanimidad = votacion.get("unanimidad") or votacion.get("unanimitat") or False

                    cur.execute("""
                        INSERT INTO puntos_pleno (acta_id, municipio_id, fecha, numero, titulo, tema, resultado, resumen, unanimidad)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        acta_id, acta["municipio_id"], acta["fecha"],
                        punto.get("numero") or punto.get("num"),
                        str(titulo)[:500],
                        str(tema)[:100] if tema else None,
                        str(resultado)[:30] if resultado else None,
                        str(resumen)[:2000] if resumen else None,
                        bool(unanimidad),
                    ))
                    punto_id = cur.fetchone()["id"]

                    # Save votaciones - handle multiple formats
                    _save_votaciones(cur, punto_id, votacion, acta["municipio_id"])

                    # Save argumentos
                    for arg in (punto.get("argumentos") or punto.get("arguments") or []):
                        if isinstance(arg, dict) and (arg.get("argumento") or arg.get("argument") or arg.get("text")):
                            text = arg.get("argumento") or arg.get("argument") or arg.get("text") or ""
                            cur.execute("""
                                INSERT INTO argumentos (punto_id, partido, posicion, argumento)
                                VALUES (%s, %s, %s, %s)
                            """, (
                                punto_id,
                                str(arg.get("partido", ""))[:100] or None,
                                str(arg.get("posicion", ""))[:20] or None,
                                str(text)[:2000],
                            ))

                # Save ruegos y preguntas
                for ruego in (result.get("ruegos_preguntas") or result.get("precs_i_preguntes") or []):
                    if isinstance(ruego, dict):
                        contenido = ruego.get("contenido") or ruego.get("contingut") or ruego.get("content") or ""
                        if contenido:
                            cur.execute("""
                                INSERT INTO puntos_pleno (acta_id, municipio_id, fecha, titulo, tema, resultado, resumen)
                                VALUES (%s, %s, %s, %s, %s, 'informativo', %s)
                            """, (
                                acta_id, acta["municipio_id"], acta["fecha"],
                                f"Prec/Pregunta: {str(contenido)[:200]}",
                                ruego.get("tema", "ruegos"),
                                str(contenido)[:2000],
                            ))

                # Update acta status
                n_puntos = len(puntos_raw)
                cur.execute("""
                    UPDATE actas SET status = 'structured', structured_at = NOW(), quality_score = %s
                    WHERE id = %s
                """, (_calc_quality(result, n_puntos), acta_id))

                logger.info(f"Structured acta {acta_id}: {n_puntos} puntos")
                return True

            except Exception as e:
                logger.error(f"Structuring failed for acta {acta_id}: {e}")
                cur.execute("""
                    UPDATE actas SET status = 'failed_structuring', error_message = %s, retry_count = retry_count + 1
                    WHERE id = %s
                """, (str(e)[:500], acta_id))
                return False


def _save_votaciones(cur, punto_id: int, votacion: dict, municipio_id: int):
    """Save votaciones handling multiple LLM output formats."""
    # Format 1: {a_favor: ["ERC", "PSC"], en_contra: ["AC"]}
    for sentido_key, sentido_val in [
        ("a_favor", "a_favor"), ("en_contra", "en_contra"),
        ("abstenciones", "abstencion"), ("abstencions", "abstencion"),
    ]:
        partidos = votacion.get(sentido_key)
        if isinstance(partidos, list):
            for partido in partidos:
                if isinstance(partido, str) and partido.strip():
                    _insert_votacion(cur, punto_id, partido.strip(), sentido_val, municipio_id)

    # Format 2: {detalle: [{partido: "ERC", sentido: "a_favor"}]}
    for det in (votacion.get("detalle") or votacion.get("detall") or []):
        if isinstance(det, dict):
            partido = det.get("partido") or det.get("partit") or ""
            sentido = det.get("sentido") or det.get("vot") or ""
            if partido and sentido:
                _insert_votacion(cur, punto_id, str(partido), str(sentido), municipio_id)


def _insert_votacion(cur, punto_id: int, partido: str, sentido: str, municipio_id: int):
    """Insert a single votacion record."""
    # Normalize sentido
    sentido_map = {
        "a_favor": "a_favor", "favor": "a_favor", "a favor": "a_favor", "sí": "a_favor", "si": "a_favor",
        "en_contra": "en_contra", "contra": "en_contra", "en contra": "en_contra", "no": "en_contra",
        "abstencion": "abstencion", "abstenció": "abstencion", "abstención": "abstencion",
    }
    sentido_norm = sentido_map.get(sentido.lower().strip(), "a_favor")

    # Try to match cargo_electo
    cur.execute("""
        SELECT id FROM cargos_electos
        WHERE municipio_id = %s AND partido ILIKE %s AND activo = TRUE
        LIMIT 1
    """, (municipio_id, f"%{partido[:50]}%"))
    cargo = cur.fetchone()
    cargo_id = cargo["id"] if cargo else None

    cur.execute("""
        INSERT INTO votaciones (punto_id, cargo_electo_id, partido, sentido)
        VALUES (%s, %s, %s, %s)
    """, (punto_id, cargo_id, partido[:100], sentido_norm))


def _calc_quality(result: dict, n_puntos: int) -> int:
    """Calcula quality_score 0-100."""
    score = 0
    puntos = result.get("puntos_orden_dia") or result.get("puntos") or []

    if n_puntos > 0:
        score += 20
    if any((p.get("votacion") or p.get("votacio")) for p in puntos if isinstance(p, dict)):
        score += 30
    if any(p.get("argumentos") for p in puntos if isinstance(p, dict)):
        score += 20
    if result.get("asistentes") or result.get("assistents"):
        score += 15
    if (result.get("sesion") or result.get("sessio", {})):
        score += 15

    return min(score, 100)
