from typing import Optional
from fastapi import APIRouter, Depends, Query
from psycopg2.extras import RealDictCursor

from ..auth import CurrentUser, get_current_user
from ..db import get_db

router = APIRouter()


@router.get("/menciones")
def menciones(
    limit: int = Query(50, le=200),
    tema: Optional[str] = None,
    sentiment: Optional[str] = None,
    dias: int = Query(14, le=90),
    _: CurrentUser = Depends(get_current_user),
):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sql = """SELECT m.id, m.fuente, m.fuente_url, m.autor, m.texto, m.publicado_at,
                        m.tema, m.sentiment, m.engagement, mu.nombre AS municipio
                 FROM mencion_social m
                 LEFT JOIN municipios mu ON mu.id = m.municipio_id
                 WHERE m.publicado_at >= NOW() - (%s || ' days')::interval"""
        params: list = [str(dias)]
        if tema:
            sql += " AND m.tema = %s"
            params.append(tema)
        if sentiment:
            sql += " AND m.sentiment = %s"
            params.append(sentiment)
        sql += " ORDER BY m.publicado_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/agregado")
def agregado(
    dias: int = Query(14, le=90),
    _: CurrentUser = Depends(get_current_user),
):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT tema, sentiment, COUNT(*) AS n, SUM(engagement) AS engagement
               FROM mencion_social
               WHERE publicado_at >= NOW() - (%s || ' days')::interval
                 AND tema IS NOT NULL
               GROUP BY tema, sentiment ORDER BY n DESC""",
            (str(dias),),
        )
        return cur.fetchall()
