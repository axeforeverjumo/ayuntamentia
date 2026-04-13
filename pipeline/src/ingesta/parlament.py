"""Ingesta de sesiones del Parlament de Catalunya.

Fuente principal: portal de transparencia parlament.cat — DSPC (Diari de Sessions
del Parlament de Catalunya) en PDF + página de iniciativas.

Esta es una primera implementación: descubre catálogo y registra sesiones.
La descarga + extracción + estructuración reutilizan el mismo flow que actas
(`actas` table), adaptado a `sesiones_parlament`.
"""

import logging
from datetime import datetime
import re

import httpx

from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


PARLAMENT_BASE = "https://www.parlament.cat"
DSPC_INDEX = f"{PARLAMENT_BASE}/web/activitat-parlamentaria/dspc/index.html"


def discover_sesiones() -> int:
    """Descubre nuevas sesiones DSPC. Implementación inicial: scrape índice.

    Para producción habría que parsear con BeautifulSoup el índice por legislatura.
    Aquí dejamos el shell + dedupe por external_id.
    """
    inserted = 0
    try:
        r = httpx.get(DSPC_INDEX, timeout=30, follow_redirects=True,
                      headers={"User-Agent": "AyuntamentIA-Parlament/1.0"})
        r.raise_for_status()
    except Exception as e:
        logger.warning(f"DSPC index error: {e}")
        return 0

    # Extracción muy básica: links a PDFs DSPC
    for m in re.finditer(r'href="([^"]*dspc[^"]*\.pdf)"[^>]*>([^<]+)</a>', r.text, re.IGNORECASE):
        url = m.group(1)
        if not url.startswith("http"):
            url = PARLAMENT_BASE + url
        title = m.group(2).strip()
        external_id = url.split("/")[-1].replace(".pdf", "")
        fecha = _extract_fecha(title) or datetime.utcnow().date()
        try:
            with get_db() as conn:
                with get_cursor(conn) as cur:
                    cur.execute(
                        """INSERT INTO sesiones_parlament (external_id, tipo, titulo, fecha, url_dspc, status)
                           VALUES (%s, 'pleno', %s, %s, %s, 'discovered')
                           ON CONFLICT (external_id) DO NOTHING""",
                        (external_id, title, fecha, url),
                    )
                    if cur.rowcount:
                        inserted += 1
        except Exception as e:
            logger.warning(f"insert sesion {external_id}: {e}")
    return inserted


def _extract_fecha(s: str):
    m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", s)
    if not m:
        return None
    d, mo, y = m.groups()
    y = int(y)
    if y < 100:
        y += 2000
    try:
        return datetime(int(y), int(mo), int(d)).date()
    except Exception:
        return None
