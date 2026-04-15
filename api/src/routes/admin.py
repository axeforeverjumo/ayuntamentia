"""Endpoints de administración: gestión de usuarios, audit log, métricas de uso."""

import os
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from ..auth import CurrentUser, require_admin, get_current_user
from ..db import get_db

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

VALID_ROLES = ("admin", "direccion", "delegado", "concejal")
VALID_AREAS = (
    "medio_ambiente", "comercio", "pesca", "agricultura", "caza",
    "urbanismo", "seguridad", "servicios_sociales", "vivienda",
    "educacion", "salud", "transporte", "cultura", "mociones",
)


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    nombre: str
    rol: str = "delegado"
    activo: bool = True
    anonimizar_nombres: bool = False
    areas: list[str] = Field(default_factory=list)
    municipio_ids: list[int] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    nombre: str
    rol: str
    activo: bool = True
    anonimizar_nombres: bool = False
    areas: Optional[list[str]] = None
    municipio_ids: Optional[list[int]] = None


# ----- Usuarios -----
@router.get("/users")
def list_users(_: CurrentUser = Depends(require_admin)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT p.user_id, p.nombre, p.rol, p.activo, p.anonimizar_nombres,
                   p.created_at,
                   COALESCE(ARRAY_AGG(DISTINCT ua.area) FILTER (WHERE ua.area IS NOT NULL), '{}') AS areas,
                   COALESCE(ARRAY_AGG(DISTINCT um.municipio_id) FILTER (WHERE um.municipio_id IS NOT NULL), '{}') AS municipio_ids,
                   COUNT(DISTINCT um.municipio_id) AS n_municipios
            FROM user_profiles p
            LEFT JOIN user_areas ua ON ua.user_id = p.user_id
            LEFT JOIN user_municipios um ON um.user_id = p.user_id
            GROUP BY p.user_id
            ORDER BY p.created_at DESC
        """)
        return cur.fetchall()


@router.post("/users")
def create_user(body: UserCreate, _: CurrentUser = Depends(require_admin)):
    """Crea l'usuari a Supabase Auth (admin API) i el seu perfil + scope."""
    if body.rol not in VALID_ROLES:
        raise HTTPException(400, f"Rol invàlid. Valors: {VALID_ROLES}")
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(500, "SUPABASE_URL/SUPABASE_SERVICE_KEY no configurats")

    # 1. Crear user a Supabase Auth (email_confirm=True per saltar-se el flow de verificació)
    try:
        r = httpx.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
                "user_metadata": {"nombre": body.nombre},
            },
            timeout=15,
        )
    except Exception as e:
        raise HTTPException(502, f"Error connectant amb Supabase: {e}")
    if r.status_code >= 300:
        raise HTTPException(r.status_code, f"Supabase: {r.text[:300]}")
    user_id = r.json().get("id")
    if not user_id:
        raise HTTPException(500, "Supabase no ha retornat user_id")

    # 2. Perfil + àrees + municipis
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO user_profiles (user_id, nombre, rol, activo, anonimizar_nombres)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, body.nombre, body.rol, body.activo, body.anonimizar_nombres),
        )
        for a in body.areas:
            if a in VALID_AREAS:
                cur.execute("INSERT INTO user_areas (user_id, area) VALUES (%s, %s)", (user_id, a))
        for mid in body.municipio_ids:
            cur.execute("INSERT INTO user_municipios (user_id, municipio_id) VALUES (%s, %s)", (user_id, mid))

    return {"ok": True, "user_id": user_id, "email": body.email}


@router.put("/users/{user_id}")
def update_profile_full(
    user_id: str,
    body: ProfileUpdate,
    _: CurrentUser = Depends(require_admin),
):
    """Actualitza perfil + (opcionalment) àrees i municipis en una sola crida."""
    if body.rol not in VALID_ROLES:
        raise HTTPException(400, f"Rol invàlid. Valors: {VALID_ROLES}")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO user_profiles (user_id, nombre, rol, activo, anonimizar_nombres)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE SET
                   nombre = EXCLUDED.nombre,
                   rol = EXCLUDED.rol,
                   activo = EXCLUDED.activo,
                   anonimizar_nombres = EXCLUDED.anonimizar_nombres""",
            (user_id, body.nombre, body.rol, body.activo, body.anonimizar_nombres),
        )
        if body.areas is not None:
            cur.execute("DELETE FROM user_areas WHERE user_id = %s", (user_id,))
            for a in body.areas:
                if a in VALID_AREAS:
                    cur.execute("INSERT INTO user_areas (user_id, area) VALUES (%s, %s)", (user_id, a))
        if body.municipio_ids is not None:
            cur.execute("DELETE FROM user_municipios WHERE user_id = %s", (user_id,))
            for mid in body.municipio_ids:
                cur.execute("INSERT INTO user_municipios (user_id, municipio_id) VALUES (%s, %s)", (user_id, mid))
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, _: CurrentUser = Depends(require_admin)):
    """Elimina usuari d'Auth + perfil (cascade elimina areas/municipios/subscripciones)."""
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            httpx.delete(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                },
                timeout=10,
            )
        except Exception:
            pass
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_profiles WHERE user_id=%s", (user_id,))
    return {"ok": True}


# Retrocompatibilitat (versió antiga, encara usada per res): mantinguda com a alias
@router.put("/users/{user_id}/areas")
def set_areas(user_id: str, areas: list[str], _: CurrentUser = Depends(require_admin)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_areas WHERE user_id = %s", (user_id,))
        for a in areas:
            if a in VALID_AREAS:
                cur.execute("INSERT INTO user_areas (user_id, area) VALUES (%s, %s)", (user_id, a))
    return {"ok": True, "areas": areas}


@router.put("/users/{user_id}/municipios")
def set_municipios(user_id: str, municipio_ids: list[int], _: CurrentUser = Depends(require_admin)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_municipios WHERE user_id = %s", (user_id,))
        for mid in municipio_ids:
            cur.execute("INSERT INTO user_municipios (user_id, municipio_id) VALUES (%s, %s)", (user_id, mid))
    return {"ok": True, "n": len(municipio_ids)}


# ----- Helpers per UI de admin -----
@router.get("/municipios")
def list_municipios_for_admin(
    q: Optional[str] = None,
    limit: int = Query(50, le=200),
    _: CurrentUser = Depends(require_admin),
):
    """Llistat paginat de municipis per al picker del modal d'edició."""
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if q and len(q) >= 2:
            cur.execute(
                "SELECT id, nombre, comarca FROM municipios WHERE nombre ILIKE %s ORDER BY nombre LIMIT %s",
                (f"%{q}%", limit),
            )
        else:
            cur.execute("SELECT id, nombre, comarca FROM municipios ORDER BY nombre LIMIT %s", (limit,))
        return cur.fetchall()


@router.get("/areas")
def list_areas(_: CurrentUser = Depends(require_admin)):
    return list(VALID_AREAS)


@router.get("/roles")
def list_roles(_: CurrentUser = Depends(require_admin)):
    return list(VALID_ROLES)


# ----- Audit log -----
@router.get("/usage")
def list_usage(
    user_id: Optional[str] = None,
    accion: Optional[str] = None,
    limit: int = Query(100, le=500),
    _: CurrentUser = Depends(require_admin),
):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        where = []
        params: list = []
        if user_id:
            where.append("user_id = %s")
            params.append(user_id)
        if accion:
            where.append("accion = %s")
            params.append(accion)
        sql = "SELECT u.*, p.nombre AS user_nombre, p.rol AS user_rol FROM usage_log u LEFT JOIN user_profiles p ON p.user_id = u.user_id"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY u.created_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/usage/summary")
def usage_summary(_: CurrentUser = Depends(require_admin)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT
                p.user_id, p.nombre, p.rol,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE u.accion = 'chat_query') AS queries_chat,
                COUNT(*) FILTER (WHERE u.accion = 'search') AS queries_search,
                MAX(u.created_at) AS last_activity
            FROM user_profiles p
            LEFT JOIN usage_log u ON u.user_id = p.user_id AND u.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY p.user_id, p.nombre, p.rol
            ORDER BY total DESC NULLS LAST
        """)
        return cur.fetchall()


# ----- Self -----
@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT telegram_chat_id FROM user_profiles WHERE user_id=%s", (user.user_id,))
        row = cur.fetchone()
    return {
        "user_id": user.user_id,
        "email": user.email,
        "nombre": user.nombre,
        "rol": user.rol,
        "areas": user.areas,
        "municipio_ids": user.municipio_ids,
        "anonimizar_nombres": user.anonimizar_nombres,
        "telegram_chat_id": row["telegram_chat_id"] if row else None,
    }


@router.post("/me/telegram-link-code")
def generate_link_code(user: CurrentUser = Depends(get_current_user)):
    """Genera un codi d'una sola sola vegada per vincular el bot Telegram amb el compte."""
    import secrets, string
    code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO telegram_link_codes (code, user_id, expires_at)
               VALUES (%s, %s, NOW() + INTERVAL '15 minutes')
               ON CONFLICT (code) DO NOTHING""",
            (code, user.user_id),
        )
    import os
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "alianza_catalana_bot")
    return {
        "code": code,
        "expires_in_minutes": 15,
        "bot_url": f"https://t.me/{bot_username}?start=vincular_{code}",
        "instructions": f"Obre @{bot_username} a Telegram i envia: /vincular {code}",
    }


@router.delete("/me/telegram")
def unlink_telegram(user: CurrentUser = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE user_profiles SET telegram_chat_id=NULL WHERE user_id=%s", (user.user_id,))
    return {"ok": True}
