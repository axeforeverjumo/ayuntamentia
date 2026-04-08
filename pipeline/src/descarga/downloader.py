"""Descarga PDFs de actas desde las URLs del catálogo."""

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
def download_pdf(url: str) -> bytes:
    """Descarga un PDF con retry y timeout."""
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        if "pdf" not in resp.headers.get("content-type", "").lower() and not url.lower().endswith(".pdf"):
            logger.warning(f"Content-type is not PDF: {resp.headers.get('content-type')} for {url}")
        return resp.content


def save_pdf(content: bytes, codi_ens: str, fecha: str, acta_id: int) -> tuple[str, str, int]:
    """Guarda el PDF en disco y devuelve (path, hash, size)."""
    file_hash = hashlib.sha256(content).hexdigest()
    year = fecha[:4] if fecha else "unknown"
    base_dir = Path(config.PDF_STORAGE_PATH) / codi_ens / year
    base_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{fecha}_{acta_id}.pdf"
    filepath = base_dir / filename

    filepath.write_bytes(content)
    return str(filepath), file_hash, len(content)


def process_download(acta_id: int):
    """Descarga un PDF para un acta específica."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id, url_pdf, codi_ens, fecha FROM actas WHERE id = %s AND status = 'discovered'",
                (acta_id,)
            )
            acta = cur.fetchone()
            if not acta:
                return False

            url = acta["url_pdf"]
            if not url:
                cur.execute(
                    "UPDATE actas SET status = 'failed_download', error_message = 'No URL' WHERE id = %s",
                    (acta_id,)
                )
                return False

            try:
                content = download_pdf(url)
                path, file_hash, size = save_pdf(
                    content,
                    acta["codi_ens"] or "unknown",
                    str(acta["fecha"]) if acta["fecha"] else "unknown",
                    acta_id
                )

                cur.execute("""
                    UPDATE actas SET
                        status = 'downloaded',
                        storage_path = %s,
                        file_hash = %s,
                        file_size = %s,
                        downloaded_at = NOW()
                    WHERE id = %s
                """, (path, file_hash, size, acta_id))

                logger.info(f"Downloaded acta {acta_id}: {size} bytes")
                return True

            except Exception as e:
                logger.error(f"Failed to download acta {acta_id}: {e}")
                cur.execute("""
                    UPDATE actas SET
                        status = 'failed_download',
                        error_message = %s,
                        retry_count = retry_count + 1
                    WHERE id = %s
                """, (str(e)[:500], acta_id))
                return False


def get_next_batch(batch_size: int = 10) -> list[int]:
    """Obtiene el siguiente batch de actas para descargar, priorizadas."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT id FROM actas
                WHERE status = 'discovered'
                AND retry_count < %s
                ORDER BY priority DESC, fecha DESC
                LIMIT %s
            """, (config.MAX_RETRIES, batch_size))
            return [row["id"] for row in cur.fetchall()]
