"""Alertas del sistema + reglas personalizadas de alerta."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field

from ..auth import CurrentUser, get_current_user, get_optional_user, log_usage
from ..db import get_cursor, get_db

router = APIRouter()


# ============================================
#  ALERTAS — listado y estado
# ============================================

@router.get("/")
def list_alertas(
    estado: Optional[str] = None,
    severidad: Optional[str] = None,
    tipo: Optional[str] = None,
    regla_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    conditions = ["1=1"]
    params: list = []

    if estado:
        conditions.append("a.estado = %s")
        params.append(estado)
    if severidad:
        conditions.append("a.severidad = %s")
        params.append(severidad)
    if tipo:
        conditions.append("a.tipo = %s")
        params.append(tipo)
    if regla_id is not None:
        conditions.append("a.regla_id = %s")
        params.append(regla_id)

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM alertas a WHERE {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT a.*, m.nombre as municipio, ce.nombre as concejal,
                   p.titulo as punto_titulo, p.tema as punto_tema,
                   r.nombre as regla_nombre
            FROM alertas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            LEFT JOIN cargos_electos ce ON a.cargo_electo_id = ce.id
            LEFT JOIN puntos_pleno p ON a.punto_id = p.id
            LEFT JOIN alertas_reglas r ON a.regla_id = r.id
            WHERE {where}
            ORDER BY
                CASE a.severidad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
                a.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        results = cur.fetchall()

    return {"total": total, "page": page, "results": results}


def _get_alertas_stats():
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


@router.get("/stats")
def alertas_stats_legacy():
    return _get_alertas_stats()


@router.get("/stats/resumen")
def alertas_stats():
    return _get_alertas_stats()


@router.get("/{alerta_id}")
def get_alerta(alerta_id: int):
    """Devuelve una alerta con TODO el contexto para mostrar en el modal de detalle."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT a.*, m.nombre as municipio, m.comarca, m.provincia, m.poblacion,
                   ce.nombre as concejal, ce.cargo,
                   p.titulo as punto_titulo, p.tema as punto_tema,
                   p.resumen as punto_resumen, p.resultado as punto_resultado,
                   p.fecha as punto_fecha,
                   r.nombre as regla_nombre, r.descripcion as regla_descripcion
            FROM alertas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            LEFT JOIN cargos_electos ce ON a.cargo_electo_id = ce.id
            LEFT JOIN puntos_pleno p ON a.punto_id = p.id
            LEFT JOIN alertas_reglas r ON a.regla_id = r.id
            WHERE a.id = %s
        """, (alerta_id,))
        alerta = cur.fetchone()
        if not alerta:
            raise HTTPException(404, "no existe")

        # Si hay punto asociado, cargar votaciones y argumentos
        votaciones = []
        argumentos = []
        if alerta.get("punto_id"):
            cur.execute("""
                SELECT partido, sentido, COUNT(*) as n
                FROM votaciones WHERE punto_id = %s
                GROUP BY partido, sentido
                ORDER BY partido, sentido
            """, (alerta["punto_id"],))
            votaciones = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT partido, posicion, argumento
                FROM argumentos WHERE punto_id = %s
                ORDER BY id LIMIT 20
            """, (alerta["punto_id"],))
            argumentos = [dict(r) for r in cur.fetchall()]

        alerta["votaciones"] = votaciones
        alerta["argumentos"] = argumentos

    return alerta


@router.patch("/{alerta_id}/estado")
def update_estado(alerta_id: int, estado: str):
    if estado not in ("nueva", "vista", "resuelta", "descartada"):
        raise HTTPException(400, "estado inválido")
    with get_db() as conn:
        cur = conn.cursor()
        if estado == "vista":
            cur.execute("UPDATE alertas SET estado='vista', viewed_at=NOW() WHERE id=%s", (alerta_id,))
        elif estado == "resuelta":
            cur.execute("UPDATE alertas SET estado='resuelta', resolved_at=NOW() WHERE id=%s", (alerta_id,))
        elif estado == "descartada":
            cur.execute("UPDATE alertas SET estado='descartada', resolved_at=NOW() WHERE id=%s", (alerta_id,))
        else:
            cur.execute("UPDATE alertas SET estado='nueva' WHERE id=%s", (alerta_id,))
    return {"ok": True}


# ============================================
#  REGLAS personalizadas de alerta (CRUD)
# ============================================

class ReglaIn(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    partidos: list[str] = Field(default_factory=list)
    temas: list[str] = Field(default_factory=list)
    concejales: list[str] = Field(default_factory=list)
    palabras_clave: list[str] = Field(default_factory=list)
    municipios: list[int] = Field(default_factory=list)
    fuentes: list[str] = Field(default_factory=lambda: ["argumentos", "puntos"])
    severidad: str = "media"
    canal: str = "web"
    min_coincidencias: int = 1
    activa: bool = True


def _validate_regla(body: ReglaIn):
    if body.severidad not in ("alta", "media", "baja"):
        raise HTTPException(400, "severidad inválida")
    if body.canal not in ("web", "email", "telegram", "all"):
        raise HTTPException(400, "canal inválido")
    if not body.partidos and not body.temas and not body.concejales and not body.palabras_clave:
        raise HTTPException(400, "indica al menos un filtro (partidos / temas / concejales / palabras_clave)")
    for f in body.fuentes:
        if f not in ("argumentos", "puntos", "votos"):
            raise HTTPException(400, f"fuente inválida: {f}")


@router.get("/reglas/")
def list_reglas(user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT r.*,
                   (SELECT COUNT(*) FROM alertas a WHERE a.regla_id = r.id) as total_alertas,
                   (SELECT COUNT(*) FROM alertas a WHERE a.regla_id = r.id AND a.estado = 'nueva') as alertas_nuevas
            FROM alertas_reglas r
            WHERE r.user_id = %s
            ORDER BY r.activa DESC, r.updated_at DESC
        """, (user.user_id,))
        return cur.fetchall()


@router.post("/reglas/")
def create_regla(
    body: ReglaIn,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    _validate_regla(body)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO alertas_reglas
            (user_id, nombre, descripcion, partidos, temas, concejales, palabras_clave,
             municipios, fuentes, severidad, canal, min_coincidencias, activa)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (user.user_id, body.nombre, body.descripcion,
              body.partidos, body.temas, body.concejales, body.palabras_clave,
              body.municipios, body.fuentes, body.severidad, body.canal,
              max(1, body.min_coincidencias), body.activa))
        row = cur.fetchone()
    log_usage(user, "regla_alerta_create",
              payload={"id": row["id"], "nombre": body.nombre,
                       "filtros": {"partidos": body.partidos, "temas": body.temas,
                                   "concejales": body.concejales, "palabras_clave": body.palabras_clave}},
              request=request)
    return row


@router.put("/reglas/{regla_id}")
def update_regla(
    regla_id: int,
    body: ReglaIn,
    user: CurrentUser = Depends(get_current_user),
):
    _validate_regla(body)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE alertas_reglas SET
              nombre=%s, descripcion=%s, partidos=%s, temas=%s, concejales=%s,
              palabras_clave=%s, municipios=%s, fuentes=%s, severidad=%s,
              canal=%s, min_coincidencias=%s, activa=%s, updated_at=NOW()
            WHERE id=%s AND user_id=%s RETURNING *
        """, (body.nombre, body.descripcion, body.partidos, body.temas,
              body.concejales, body.palabras_clave, body.municipios, body.fuentes,
              body.severidad, body.canal, max(1, body.min_coincidencias),
              body.activa, regla_id, user.user_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "no existe")
    return row


@router.delete("/reglas/{regla_id}")
def delete_regla(regla_id: int, user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM alertas_reglas WHERE id=%s AND user_id=%s", (regla_id, user.user_id))
        if cur.rowcount == 0:
            raise HTTPException(404, "no existe")
    return {"ok": True}


@router.post("/reglas/{regla_id}/run")
def run_regla_manual(
    regla_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    """Ejecuta una regla manualmente (útil para probar al crearla)."""
    from ..services.alertas_evaluator import evaluate_regla
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM alertas_reglas WHERE id=%s AND user_id=%s",
                    (regla_id, user.user_id))
        regla = cur.fetchone()
        if not regla:
            raise HTTPException(404, "no existe")
    n_matches = evaluate_regla(dict(regla))
    return {"ok": True, "matches": n_matches}


# ============================================
#  Endpoint interno para el cron de Celery
# ============================================
@router.post("/reglas/_run_all")
def run_all_rules_internal(request: Request):
    """Evalúa TODAS las reglas activas. Protegido con ALERT_RULES_CRON_TOKEN
    (un secreto compartido entre api y pipeline). Llamado por Celery cada 30 min."""
    import os
    expected = os.getenv("ALERT_RULES_CRON_TOKEN", "")
    provided = (request.headers.get("authorization", "").replace("Bearer ", "").strip()
                or request.headers.get("x-cron-token", "").strip())
    # Si no hay token configurado, solo permitir desde localhost
    if expected:
        if provided != expected:
            raise HTTPException(401, "token inválido")
    else:
        client_host = request.client.host if request.client else ""
        if client_host not in ("127.0.0.1", "::1", "localhost"):
            raise HTTPException(403, "solo accesible desde localhost si no hay token")

    from ..services.alertas_evaluator import run_all_active_rules
    return run_all_active_rules()
