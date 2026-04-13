"""Clasifica menciones sociales: tema, sentiment, municipio inferido."""

import json
import logging

from ..db import get_db, get_cursor
from ..llm.openclaw_client import call_mini

logger = logging.getLogger(__name__)


CLASSIFIER_PROMPT = """Clasifica este texto público en JSON estricto:
{
  "tema": "<una de: urbanismo, hacienda, seguridad, medio_ambiente, cultura, transporte, servicios_sociales, vivienda, educacion, salud, comercio, agricultura, pesca, caza, inmigracion, mociones, otros>",
  "sentiment": "<positivo|negativo|neutro>",
  "municipio": "<nombre municipio catalán mencionado o null>"
}
Solo JSON, sin texto adicional."""


def classify_pending_batch(limit: int = 20) -> dict:
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id, texto FROM mencion_social WHERE tema IS NULL ORDER BY publicado_at DESC LIMIT %s",
                (limit,),
            )
            rows = cur.fetchall()

    classified = 0
    for r in rows:
        try:
            raw = call_mini(CLASSIFIER_PROMPT, r["texto"][:2000])
            data = _extract_json(raw)
            if not data:
                continue
            tema = data.get("tema") or "otros"
            sentiment = data.get("sentiment") or "neutro"
            mun_nombre = data.get("municipio")
            mun_id = _resolve_municipio(mun_nombre) if mun_nombre else None
            with get_db() as conn:
                with get_cursor(conn) as cur:
                    cur.execute(
                        """UPDATE mencion_social
                           SET tema=%s, sentiment=%s, municipio_id=%s
                           WHERE id=%s""",
                        (tema, sentiment, mun_id, r["id"]),
                    )
            classified += 1
        except Exception as e:
            logger.warning(f"classify {r['id']}: {e}")
    return {"checked": len(rows), "classified": classified}


def _extract_json(text: str) -> dict | None:
    import re
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group())
        except Exception:
            return None
    return None


def _resolve_municipio(nombre: str) -> int | None:
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id FROM municipios WHERE LOWER(nombre) = LOWER(%s) LIMIT 1",
                (nombre.strip(),),
            )
            row = cur.fetchone()
            if row:
                return row["id"]
            cur.execute(
                "SELECT id FROM municipios WHERE LOWER(nombre) ILIKE LOWER(%s) ORDER BY poblacion DESC NULLS LAST LIMIT 1",
                (f"%{nombre.strip()}%",),
            )
            row = cur.fetchone()
            return row["id"] if row else None
