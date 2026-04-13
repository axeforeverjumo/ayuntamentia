"""Auth + RBAC para la API.

Verifica JWT emitidos por Supabase Auth (HS256 con SUPABASE_JWT_SECRET).
Carga el perfil del usuario desde user_profiles y expone scopes (áreas/municipios).
"""

import os
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from psycopg2.extras import RealDictCursor

from .db import get_db

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_ALG = "HS256"
JWT_AUDIENCE = "authenticated"

bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, user_id: str, email: str, profile: dict, areas: list[str], municipio_ids: list[int]):
        self.user_id = user_id
        self.email = email
        self.nombre = profile["nombre"]
        self.rol = profile["rol"]
        self.activo = profile["activo"]
        self.anonimizar_nombres = profile.get("anonimizar_nombres", False)
        self.areas = areas
        self.municipio_ids = municipio_ids

    @property
    def is_admin(self) -> bool:
        return self.rol == "admin"

    @property
    def has_full_access(self) -> bool:
        """admin y direccion ven todo. delegado/concejal ven scoped."""
        return self.rol in ("admin", "direccion")

    def can_view_municipio(self, municipio_id: int) -> bool:
        if self.has_full_access:
            return True
        return municipio_id in self.municipio_ids

    def can_view_area(self, area: str) -> bool:
        if self.has_full_access:
            return True
        return area in self.areas


def _decode_jwt(token: str) -> dict:
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        return jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[JWT_ALG], audience=JWT_AUDIENCE)
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


def _load_profile(user_id: str) -> Optional[CurrentUser]:
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM user_profiles WHERE user_id = %s AND activo = TRUE", (user_id,))
        prof = cur.fetchone()
        if not prof:
            return None
        cur.execute("SELECT area FROM user_areas WHERE user_id = %s", (user_id,))
        areas = [r["area"] for r in cur.fetchall()]
        cur.execute("SELECT municipio_id FROM user_municipios WHERE user_id = %s", (user_id,))
        muns = [r["municipio_id"] for r in cur.fetchall()]
        return prof, areas, muns


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = _decode_jwt(creds.credentials)
    user_id = payload.get("sub")
    email = payload.get("email", "")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin sub")
    loaded = _load_profile(user_id)
    if loaded is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario sin perfil activo")
    profile, areas, muns = loaded
    return CurrentUser(user_id, email, profile, areas, muns)


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol admin")
    return user


def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[CurrentUser]:
    """Para endpoints públicos que quieren registrar uso si hay sesión."""
    if creds is None:
        return None
    try:
        payload = _decode_jwt(creds.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        loaded = _load_profile(user_id)
        if loaded is None:
            return None
        profile, areas, muns = loaded
        return CurrentUser(user_id, payload.get("email", ""), profile, areas, muns)
    except Exception:
        return None


# ============================================
# AUDIT LOG
# ============================================

def log_usage(
    user: Optional[CurrentUser],
    accion: str,
    payload: Optional[dict] = None,
    response_meta: Optional[dict] = None,
    request: Optional[Request] = None,
):
    """Registra una acción en usage_log. Nunca lanza (para no romper la request)."""
    try:
        import json
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO usage_log (user_id, accion, payload, response_meta, ip, user_agent)
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s, %s)
                """,
                (
                    user.user_id if user else None,
                    accion,
                    json.dumps(payload, ensure_ascii=False, default=str) if payload else None,
                    json.dumps(response_meta, ensure_ascii=False, default=str) if response_meta else None,
                    request.client.host if request and request.client else None,
                    request.headers.get("user-agent") if request else None,
                ),
            )
    except Exception:
        pass
