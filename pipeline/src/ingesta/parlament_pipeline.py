"""Pipeline completo para sesiones del Parlament: download → extract → structure.

Reutiliza la lógica de actas pero opera sobre la tabla `sesiones_parlament`.
"""

import hashlib
import logging
import os
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import config
from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=30))
def _http_get(url: str) -> bytes:
    with httpx.Client(timeout=180, follow_redirects=True,
                      headers={"User-Agent": "AyuntamentIA-Parlament/1.0"}) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.content


def get_next_batch(batch_size: int = 3) -> list[int]:
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                UPDATE sesiones_parlament SET status = 'queued'
                WHERE id IN (
                    SELECT id FROM sesiones_parlament
                    WHERE status = 'discovered' AND retry_count < %s
                    ORDER BY fecha DESC LIMIT %s
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id
            """, (config.MAX_RETRIES, batch_size))
            return [r["id"] for r in cur.fetchall()]


def download_sesion(sesion_id: int) -> bool:
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id, url_dspc, fecha FROM sesiones_parlament WHERE id=%s AND status IN ('discovered','queued')",
                (sesion_id,))
            s = cur.fetchone()
            if not s or not s["url_dspc"]:
                return False
            try:
                content = _http_get(s["url_dspc"])
                year = str(s["fecha"])[:4]
                base = Path(config.PDF_STORAGE_PATH) / "parlament" / year
                base.mkdir(parents=True, exist_ok=True)
                fp = base / f"{sesion_id}.pdf"
                fp.write_bytes(content)
                file_hash = hashlib.sha256(content).hexdigest()
                cur.execute(
                    """UPDATE sesiones_parlament SET status='downloaded', storage_path=%s,
                       file_hash=%s WHERE id=%s""",
                    (str(fp), file_hash, sesion_id))
                return True
            except Exception as e:
                logger.error(f"download parlament {sesion_id}: {e}")
                cur.execute(
                    """UPDATE sesiones_parlament SET status='failed_download',
                       error_message=%s, retry_count=retry_count+1 WHERE id=%s""",
                    (str(e)[:500], sesion_id))
                return False


def extract_sesion(sesion_id: int) -> bool:
    from ..extraccion.pdf_extractor import extract_native, extract_ocr, MIN_CHARS_THRESHOLD
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("SELECT storage_path FROM sesiones_parlament WHERE id=%s AND status='downloaded'", (sesion_id,))
            s = cur.fetchone()
            if not s or not s["storage_path"]:
                return False
            try:
                texto, _ = extract_native(s["storage_path"])
                if len(texto) < MIN_CHARS_THRESHOLD:
                    texto, _ = extract_ocr(s["storage_path"])
                cur.execute(
                    "UPDATE sesiones_parlament SET status='extracted', texto=%s WHERE id=%s",
                    (texto, sesion_id))
                return True
            except Exception as e:
                logger.error(f"extract parlament {sesion_id}: {e}")
                cur.execute(
                    "UPDATE sesiones_parlament SET status='failed_extraction', error_message=%s WHERE id=%s",
                    (str(e)[:500], sesion_id))
                return False


def structure_sesion(sesion_id: int) -> bool:
    """Estructura el DSPC: extrae puntos debatidos y los inserta en puntos_pleno con nivel='parlament'."""
    import json
    from ..llm.openclaw_client import call_mini, _extract_json
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("SELECT texto, fecha FROM sesiones_parlament WHERE id=%s AND status='extracted'", (sesion_id,))
            s = cur.fetchone()
            if not s or not s["texto"]:
                return False
            prompt = (
                "Eres un analista parlamentario. Del siguiente Diari de Sessions del Parlament de Catalunya, "
                "extrae los puntos del orden del día como JSON estricto:\n"
                '{"puntos": [{"titulo":"...","tema":"<urbanismo|hacienda|seguridad|medio_ambiente|cultura|transporte|servicios_sociales|vivienda|educacion|salud|comercio|agricultura|pesca|caza|inmigracion|mociones|otros>","resumen":"...","resultado":"<aprobada|rechazada|debate|null>","partido_proponente":"<grupo o null>"}]}\n'
                "Solo JSON, sin texto adicional."
            )
            try:
                raw = call_mini(prompt, s["texto"][:25000])
                data = _extract_json(raw)
                if not data or "puntos" not in data or "error" in data:
                    raise ValueError("JSON sin puntos")
                inserted = 0
                for p in data["puntos"][:50]:
                    cur.execute(
                        """INSERT INTO puntos_pleno
                           (sesion_parlament_id, fecha, titulo, tema, resumen, resultado,
                            partido_proponente, nivel)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, 'parlament')""",
                        (sesion_id, s["fecha"], p.get("titulo", "")[:500], p.get("tema"),
                         p.get("resumen"), p.get("resultado"), p.get("partido_proponente")))
                    inserted += 1
                cur.execute(
                    "UPDATE sesiones_parlament SET status='structured', structured_at=NOW() WHERE id=%s",
                    (sesion_id,))
                return True
            except Exception as e:
                logger.error(f"structure parlament {sesion_id}: {e}")
                cur.execute(
                    "UPDATE sesiones_parlament SET status='failed_structuring', error_message=%s WHERE id=%s",
                    (str(e)[:500], sesion_id))
                return False
