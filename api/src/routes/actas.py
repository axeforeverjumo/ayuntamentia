from fastapi import APIRouter, Depends, Query
from typing import Optional
from ..db import get_cursor
from ..auth import CurrentUser, get_optional_user
from ..anonymize import _iniciales

router = APIRouter()


@router.get("/")
def list_actas(
    municipio_id: Optional[int] = None,
    status: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    conditions = ["1=1"]
    params = []

    if municipio_id:
        conditions.append("a.municipio_id = %s")
        params.append(municipio_id)
    if status:
        conditions.append("a.status = %s")
        params.append(status)
    if fecha_desde:
        conditions.append("a.fecha >= %s")
        params.append(fecha_desde)
    if fecha_hasta:
        conditions.append("a.fecha <= %s")
        params.append(fecha_hasta)

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM actas a WHERE {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT a.id, a.fecha, a.tipo, a.nom_ens, a.status, a.quality_score,
                   a.url_pdf, m.nombre as municipio,
                   (SELECT COUNT(*) FROM puntos_pleno p WHERE p.acta_id = a.id) as num_puntos
            FROM actas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            WHERE {where}
            ORDER BY a.fecha DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        return {"total": total, "page": page, "results": cur.fetchall()}


@router.get("/{acta_id}")
def get_acta(acta_id: int, user: Optional[CurrentUser] = Depends(get_optional_user)):
    with get_cursor() as cur:
        cur.execute("""
            SELECT a.*, m.nombre as municipio, m.comarca, m.provincia
            FROM actas a LEFT JOIN municipios m ON a.municipio_id = m.id
            WHERE a.id = %s
        """, (acta_id,))
        acta = cur.fetchone()
        if not acta:
            return {"error": "not found"}

        # Get puntos
        cur.execute("""
            SELECT p.*, json_agg(DISTINCT jsonb_build_object(
                'partido', v.partido, 'sentido', v.sentido
            )) FILTER (WHERE v.id IS NOT NULL) as votaciones,
            json_agg(DISTINCT jsonb_build_object(
                'partido', arg.partido, 'posicion', arg.posicion, 'argumento', arg.argumento
            )) FILTER (WHERE arg.id IS NOT NULL) as argumentos
            FROM puntos_pleno p
            LEFT JOIN votaciones v ON v.punto_id = p.id
            LEFT JOIN argumentos arg ON arg.punto_id = p.id
            WHERE p.acta_id = %s
            GROUP BY p.id
            ORDER BY p.numero
        """, (acta_id,))
        puntos = cur.fetchall()

        # Get asistentes from analisis JSON
        cur.execute("SELECT datos_completos FROM actas_analisis WHERE acta_id = %s", (acta_id,))
        analisis = cur.fetchone()
        asistentes = []
        if analisis and analisis.get("datos_completos"):
            asistentes = analisis["datos_completos"].get("asistentes", [])

        # RGPD: si el usuario tiene anonimizar_nombres, ofusca asistentes
        if user and user.anonimizar_nombres and not user.has_full_access:
            asistentes = [_iniciales(a) if isinstance(a, str) else a for a in asistentes]

        return {**acta, "puntos": puntos, "asistentes": asistentes}
