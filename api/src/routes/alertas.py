from fastapi import APIRouter, Query
from typing import Optional
from ..db import get_cursor, get_db

router = APIRouter()


@router.get("/")
def list_alertas(
    estado: Optional[str] = None,
    severidad: Optional[str] = None,
    tipo: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    conditions = ["1=1"]
    params = []

    if estado:
        conditions.append("a.estado = %s")
        params.append(estado)
    if severidad:
        conditions.append("a.severidad = %s")
        params.append(severidad)
    if tipo:
        conditions.append("a.tipo = %s")
        params.append(tipo)

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM alertas a WHERE {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT a.*, m.nombre as municipio, ce.nombre as concejal,
                   p.titulo as punto_titulo, p.tema as punto_tema
            FROM alertas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            LEFT JOIN cargos_electos ce ON a.cargo_electo_id = ce.id
            LEFT JOIN puntos_pleno p ON a.punto_id = p.id
            WHERE {where}
            ORDER BY
                CASE a.severidad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
                a.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        results = cur.fetchall()

    return {"total": total, "page": page, "results": results}


@router.get("/{alerta_id}")
def get_alerta(alerta_id: int):
    with get_cursor() as cur:
        cur.execute("""
            SELECT a.*, m.nombre as municipio, ce.nombre as concejal,
                   p.titulo as punto_titulo, p.tema, p.resumen, p.resultado
            FROM alertas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            LEFT JOIN cargos_electos ce ON a.cargo_electo_id = ce.id
            LEFT JOIN puntos_pleno p ON a.punto_id = p.id
            WHERE a.id = %s
        """, (alerta_id,))
        return cur.fetchone()


@router.patch("/{alerta_id}/estado")
def update_estado(alerta_id: int, estado: str):
    with get_db() as conn:
        cur = conn.cursor()
        if estado == "vista":
            cur.execute("UPDATE alertas SET estado = 'vista', viewed_at = NOW() WHERE id = %s", (alerta_id,))
        elif estado == "resuelta":
            cur.execute("UPDATE alertas SET estado = 'resuelta', resolved_at = NOW() WHERE id = %s", (alerta_id,))
        elif estado == "descartada":
            cur.execute("UPDATE alertas SET estado = 'descartada', resolved_at = NOW() WHERE id = %s", (alerta_id,))
        cur.close()
    return {"ok": True}


@router.get("/stats/resumen")
def alertas_stats():
    with get_cursor() as cur:
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE estado = 'nueva') as nuevas,
                COUNT(*) FILTER (WHERE estado = 'nueva' AND severidad = 'alta') as altas_nuevas,
                COUNT(*) FILTER (WHERE estado = 'nueva' AND severidad = 'media') as medias_nuevas,
                COUNT(*) FILTER (WHERE estado = 'nueva' AND severidad = 'baja') as bajas_nuevas,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as semana,
                COUNT(*) as total
            FROM alertas
        """)
        return cur.fetchone()
