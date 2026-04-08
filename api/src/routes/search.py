import re
from fastapi import APIRouter, Query
from typing import Optional
from ..db import get_cursor

router = APIRouter()


def _build_tsquery(q: str) -> str:
    """Build a safe OR-based tsquery from user input."""
    words = re.findall(r'\w{3,}', q)
    if not words:
        return q
    # Sanitize each word and join with OR
    safe = [w.replace("'", "''") for w in words[:8]]  # max 8 words
    return " | ".join(safe)


@router.get("/")
def search(
    q: str = Query(..., min_length=2),
    municipio: Optional[str] = None,
    partido: Optional[str] = None,
    tema: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    offset = (page - 1) * limit
    conditions = ["a.texto IS NOT NULL"]
    params = []

    tsquery = _build_tsquery(q)
    conditions.append("a.tsv @@ to_tsquery('spanish', %s)")
    params.append(tsquery)

    if municipio:
        conditions.append("m.nombre ILIKE %s")
        params.append(f"%{municipio}%")

    if partido:
        conditions.append("""EXISTS (
            SELECT 1 FROM votaciones v2
            JOIN puntos_pleno p2 ON v2.punto_id = p2.id
            WHERE p2.acta_id = a.id AND v2.partido ILIKE %s
        )""")
        params.append(f"%{partido}%")

    if tema:
        conditions.append("EXISTS (SELECT 1 FROM puntos_pleno p3 WHERE p3.acta_id = a.id AND p3.tema = %s)")
        params.append(tema)

    if fecha_desde:
        conditions.append("a.fecha >= %s")
        params.append(fecha_desde)

    if fecha_hasta:
        conditions.append("a.fecha <= %s")
        params.append(fecha_hasta)

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(f"""
            SELECT COUNT(*) as total FROM actas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            WHERE {where}
        """, params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT a.id, a.fecha, a.tipo, a.nom_ens, a.status, a.quality_score,
                   m.nombre as municipio, m.comarca,
                   ts_rank(a.tsv, to_tsquery('spanish', %s)) as relevance,
                   ts_headline('spanish', LEFT(a.texto, 3000), to_tsquery('spanish', %s),
                       'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as snippet
            FROM actas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            WHERE {where}
            ORDER BY
                CASE WHEN a.status = 'structured' THEN 0 ELSE 1 END,
                relevance DESC, a.fecha DESC
            LIMIT %s OFFSET %s
        """, [tsquery, tsquery] + params + [limit, offset])
        results = cur.fetchall()

    return {"total": total, "page": page, "limit": limit, "results": results}
