from fastapi import APIRouter, Query
from typing import Optional
from ..db import get_cursor

router = APIRouter()


@router.get("/")
def list_municipios(
    provincia: Optional[str] = None,
    tiene_ac: Optional[bool] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    offset = (page - 1) * limit
    conditions = ["1=1"]
    params = []

    if provincia:
        conditions.append("m.provincia = %s")
        params.append(provincia)
    if tiene_ac is not None:
        conditions.append("m.tiene_ac = %s")
        params.append(tiene_ac)
    if q:
        conditions.append("m.nombre ILIKE %s")
        params.append(f"%{q}%")

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM municipios m WHERE {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT m.*,
                NULLIF(m.external_data->>'latitud','')::double precision as lat,
                NULLIF(m.external_data->>'longitud','')::double precision as lng,
                (SELECT COUNT(*) FROM actas a WHERE a.municipio_id = m.id AND a.status = 'structured') as actas_procesadas,
                (SELECT COUNT(*) FROM cargos_electos c WHERE c.municipio_id = m.id AND c.activo) as num_concejales,
                (SELECT MAX(a.fecha) FROM actas a WHERE a.municipio_id = m.id AND a.status = 'structured') as ultima_acta,
                (SELECT COUNT(*) FROM alertas al WHERE al.municipio_id = m.id AND al.estado = 'nueva') as alertas_pendientes
            FROM municipios m
            WHERE {where}
            ORDER BY m.tiene_ac DESC, m.poblacion DESC NULLS LAST
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()
        for r in rows:
            r.pop("external_data", None)
        return {"total": total, "page": page, "results": rows}


@router.get("/geo/points")
def geo_points():
    """Punts lleugers per al mapa: id, nom, lat, lng, tiene_ac, actas_procesadas."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT m.id, m.nombre, m.tiene_ac,
                NULLIF(m.external_data->>'latitud','')::double precision as lat,
                NULLIF(m.external_data->>'longitud','')::double precision as lng,
                (SELECT COUNT(*) FROM actas a WHERE a.municipio_id = m.id AND a.status = 'structured') as actas_procesadas
            FROM municipios m
            WHERE m.external_data->>'latitud' IS NOT NULL
              AND m.external_data->>'longitud' IS NOT NULL
        """)
        return cur.fetchall()


@router.get("/{municipio_id}")
def get_municipio(municipio_id: int):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM municipios WHERE id = %s", (municipio_id,))
        mun = cur.fetchone()
        if not mun:
            return {"error": "not found"}

        cur.execute("""
            SELECT * FROM cargos_electos
            WHERE municipio_id = %s AND activo ORDER BY orden
        """, (municipio_id,))
        concejales = cur.fetchall()

        cur.execute("""
            SELECT partido, COUNT(*) as count FROM cargos_electos
            WHERE municipio_id = %s AND activo GROUP BY partido ORDER BY count DESC
        """, (municipio_id,))
        composicion = cur.fetchall()

        cur.execute("""
            SELECT a.id, a.fecha, a.tipo,
                (SELECT COUNT(*) FROM puntos_pleno p WHERE p.acta_id = a.id) as num_puntos
            FROM actas a WHERE a.municipio_id = %s AND a.status = 'structured'
            ORDER BY a.fecha DESC LIMIT 10
        """, (municipio_id,))
        ultimos_plenos = cur.fetchall()

        cur.execute("""
            SELECT p.tema, COUNT(*) as count FROM puntos_pleno p
            WHERE p.municipio_id = %s AND p.tema IS NOT NULL
            GROUP BY p.tema ORDER BY count DESC LIMIT 10
        """, (municipio_id,))
        temas = cur.fetchall()

        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE al.severidad = 'alta') as altas,
                   COUNT(*) FILTER (WHERE al.severidad = 'media') as medias,
                   COUNT(*) FILTER (WHERE al.severidad = 'baja') as bajas
            FROM alertas al WHERE al.municipio_id = %s AND al.estado = 'nueva'
        """, (municipio_id,))
        alertas = cur.fetchone()

        return {
            **mun,
            "concejales": concejales,
            "composicion": composicion,
            "ultimos_plenos": ultimos_plenos,
            "temas_frecuentes": temas,
            "alertas": alertas,
        }
