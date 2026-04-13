"""Ofuscación RGPD: anonimiza nombres de particulares en datos devueltos al usuario.

Los cargos públicos (`cargos_electos.cargo` definido) mantienen nombre completo.
Los nombres "sueltos" (ej. `nombre_raw` de actas) se reducen a iniciales cuando
el rol del usuario no es admin/direccion y tiene `anonimizar_nombres=true`.
"""

import re
from typing import Any


def _iniciales(nombre: str) -> str:
    if not nombre:
        return nombre
    parts = [p for p in re.split(r"\s+", nombre.strip()) if p]
    if len(parts) == 1:
        return parts[0][0].upper() + "."
    return " ".join(p[0].upper() + "." for p in parts[:3])


def anonymize_value(value: Any, key: str) -> Any:
    """Para un campo específico, devuelve su versión anonimizada."""
    if not value or not isinstance(value, str):
        return value
    if key in ("nombre_raw", "autor"):
        return _iniciales(value)
    return value


def anonymize_rows(rows: list[dict], *, enabled: bool, keys: tuple = ("nombre_raw", "autor")) -> list[dict]:
    if not enabled or not rows:
        return rows
    return [
        {k: anonymize_value(v, k) if k in keys else v for k, v in r.items()}
        for r in rows
    ]
