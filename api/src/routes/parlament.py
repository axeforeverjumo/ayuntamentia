import os
from typing import Optional
from fastapi import APIRouter, Depends, Query
from psycopg2.extras import RealDictCursor

from ..auth import CurrentUser, get_current_user
from ..db import get_db

router = APIRouter()


@router.get("/config-status")
def config_status(_: CurrentUser = Depends(get_current_user)):
    required = {
        "DATABASE_URL": os.getenv("DATABASE_URL"),
        "REDIS_URL": os.getenv("REDIS_URL"),
        "OPENCLAW_BASE_URL": os.getenv("OPENCLAW_BASE_URL"),
        "OPENCLAW_MODEL_MINI": os.getenv("OPENCLAW_MODEL_MINI"),
        "PDF_STORAGE_PATH": os.getenv("PDF_STORAGE_PATH"),
        "PARLAMENT_BASE_URL": os.getenv("PARLAMENT_BASE_URL", "https://www.parlament.cat"),
        "PARLAMENT_DSPC_INDEX_URL": os.getenv(
            "PARLAMENT_DSPC_INDEX_URL",
            "https://www.parlament.cat/web/activitat-parlamentaria/dspc/index.html",
        ),
        "PARLAMENT_USER_AGENT": os.getenv("PARLAMENT_USER_AGENT", "AyuntamentIA-Parlament/1.0"),
        "PARLAMENT_BATCH_SIZE": os.getenv("PARLAMENT_BATCH_SIZE", "2"),
        "PARLAMENT_DISCOVER_HOUR": os.getenv("PARLAMENT_DISCOVER_HOUR", "2"),
        "PARLAMENT_ALLOWED_TYPES": os.getenv("PARLAMENT_ALLOWED_TYPES", "pleno"),
        "PARLAMENT_ENABLED": os.getenv("PARLAMENT_ENABLED", "1"),
    }
    missing = [key for key, value in required.items() if value in (None, "")]

    db = {"ok": False, "error": None}
    try:
        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT to_regclass('public.sesiones_parlament') AS sesiones, to_regclass('public.puntos_pleno') AS puntos, to_regclass('public.v_contradicciones_rival') AS contradicciones")
            row = cur.fetchone()
            db = {
                "ok": all(row.values()),
                "objects": row,
                "error": None,
            }
    except Exception as exc:
        db = {"ok": False, "error": str(exc)}

    return {
        "enabled": required["PARLAMENT_ENABLED"] == "1",
        "config_ok": len(missing) == 0,
        "missing": missing,
        "values": required,
        "db": db,
    }


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
