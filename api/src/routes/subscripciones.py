"""CRUD de suscripciones a informes temáticos."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field

from ..auth import CurrentUser, get_current_user, log_usage
from ..db import get_db

router = APIRouter()


class SubscripcionIn(BaseModel):
    nombre: str
    temas: list[str] = Field(default_factory=list)
    municipios: list[int] = Field(default_factory=list)
    prompt_libre: Optional[str] = None  # consulta en lenguaje natural
    ventana_dias: int = 7  # ventana temporal del brief
    canal: str = "email"  # email|telegram|both
    cron_expr: str = "0 8 * * 5"  # viernes 8am
    activo: bool = True


@router.get("")
def list_mine(user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT * FROM subscripciones WHERE user_id = %s ORDER BY created_at DESC",
            (user.user_id,),
        )
        return cur.fetchall()


@router.post("")
def create(
    body: SubscripcionIn,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    if body.canal not in ("email", "telegram", "both"):
        raise HTTPException(400, "canal inválido")
    if not body.temas and not (body.prompt_libre and body.prompt_libre.strip()):
        raise HTTPException(400, "indica temes o una consulta lliure")
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """INSERT INTO subscripciones (user_id, nombre, temas, municipios, prompt_libre, ventana_dias, canal, cron_expr, activo)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (user.user_id, body.nombre, body.temas, body.municipios,
             (body.prompt_libre or None), max(1, min(365, body.ventana_dias)),
             body.canal, body.cron_expr, body.activo),
        )
        row = cur.fetchone()
    log_usage(user, "subscripcion_create",
              payload={"id": row["id"], "temas": body.temas, "prompt_libre": bool(body.prompt_libre)},
              request=request)
    return row


@router.put("/{sub_id}")
def update(sub_id: int, body: SubscripcionIn, user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """UPDATE subscripciones SET
                nombre=%s, temas=%s, municipios=%s, prompt_libre=%s, ventana_dias=%s,
                canal=%s, cron_expr=%s, activo=%s, updated_at=NOW()
               WHERE id=%s AND user_id=%s RETURNING *""",
            (body.nombre, body.temas, body.municipios, (body.prompt_libre or None),
             max(1, min(365, body.ventana_dias)),
             body.canal, body.cron_expr, body.activo, sub_id, user.user_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "no existe")
    return row


@router.delete("/{sub_id}")
def delete(sub_id: int, user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM subscripciones WHERE id=%s AND user_id=%s", (sub_id, user.user_id))
    return {"ok": True}


@router.post("/{sub_id}/preview")
def preview(sub_id: int, user: CurrentUser = Depends(get_current_user)):
    """Genera el brief en modo dry-run (sin enviar)."""
    from ..services.thematic_brief import generate_brief_for_subscripcion
    return {"brief": generate_brief_for_subscripcion(sub_id, dry_run=True)}
