from typing import Optional
from fastapi import APIRouter, Depends, Query
from psycopg2.extras import RealDictCursor

from ..auth import CurrentUser, get_current_user
from ..db import get_db

router = APIRouter()


@router.get("/sesiones")
def list_sesiones(
    limit: int = Query(50, le=200),
    status: Optional[str] = None,
    _: CurrentUser = Depends(get_current_user),
):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sql = "SELECT id, tipo, titulo, fecha, status, structured_at FROM sesiones_parlament"
        params: list = []
        if status:
            sql += " WHERE status = %s"
            params.append(status)
        sql += " ORDER BY fecha DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/puntos")
def list_puntos(
    limit: int = Query(50, le=200),
    tema: Optional[str] = None,
    _: CurrentUser = Depends(get_current_user),
):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sql = """SELECT p.id, p.titulo, p.tema, p.resumen, p.resultado, p.partido_proponente,
                        p.fecha, s.tipo
                 FROM puntos_pleno p JOIN sesiones_parlament s ON s.id = p.sesion_parlament_id
                 WHERE p.nivel = 'parlament'"""
        params: list = []
        if tema:
            sql += " AND p.tema = %s"
            params.append(tema)
        sql += " ORDER BY p.fecha DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/contradicciones")
def contradicciones(_: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM v_contradicciones_rival LIMIT 30")
        return cur.fetchall()
