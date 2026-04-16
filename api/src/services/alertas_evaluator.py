"""Evaluador de reglas de alerta personalizadas.

Cada regla define filtros (partidos, temas, concejales, palabras clave, municipios).
El worker llama a `evaluate_regla(regla)` y crea filas en `alertas` por cada
coincidencia nueva desde `last_run_at`. Usa índice único (regla_id, punto_id)
para evitar duplicados.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..db import get_db

logger = logging.getLogger(__name__)


def _partido_where_for_column(col: str, partidos: list[str]) -> tuple[str, list]:
    """Construye cláusula WHERE con `_partido_where` del chat reutilizado."""
    from ..routes.chat import _partido_where
    if not partidos:
        return "", []
    clauses = []
    for p in partidos:
        clause = _partido_where(p).replace("v.partido", col)
        clauses.append(f"({clause})")
    return "(" + " OR ".join(clauses) + ")", []


def _build_keyword_clause(col: str, palabras: list[str]) -> tuple[str, list]:
    if not palabras:
        return "", []
    parts = []
    params: list = []
    for w in palabras:
        parts.append(f"{col} ILIKE %s")
        params.append(f"%{w}%")
    return "(" + " OR ".join(parts) + ")", params


def _build_concejal_clause(col: str, concejales: list[str]) -> tuple[str, list]:
    """Busca nombres parciales en el texto del argumento/resumen."""
    if not concejales:
        return "", []
    parts = []
    params: list = []
    for n in concejales:
        parts.append(f"{col} ILIKE %s")
        params.append(f"%{n}%")
    return "(" + " OR ".join(parts) + ")", params


def _insert_alerta(cur, regla: dict, punto_id: int | None, municipio_id: int | None,
                   titulo: str, descripcion: str, contexto: dict | None = None) -> bool:
    """Crea una alerta respetando la UNIQUE(regla_id, punto_id). Devuelve True si se insertó."""
    import json as _json
    cur.execute("""
        INSERT INTO alertas (tipo, severidad, titulo, descripcion,
                             punto_id, municipio_id, regla_id, contexto, estado)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'nueva')
        ON CONFLICT (regla_id, punto_id) WHERE regla_id IS NOT NULL AND punto_id IS NOT NULL
        DO NOTHING
        RETURNING id
    """, ("regla_personalizada", regla["severidad"], titulo[:500], descripcion[:2000],
          punto_id, municipio_id, regla["id"],
          _json.dumps(contexto or {}, default=str, ensure_ascii=False)))
    return cur.fetchone() is not None


def evaluate_regla(regla: dict) -> int:
    """Evalúa una regla y crea alertas por cada coincidencia nueva.
    Devuelve el número de alertas creadas."""
    since = regla.get("last_run_at")
    partidos = regla.get("partidos") or []
    temas = regla.get("temas") or []
    concejales = regla.get("concejales") or []
    palabras = regla.get("palabras_clave") or []
    municipios = regla.get("municipios") or []
    fuentes = regla.get("fuentes") or ["argumentos", "puntos"]

    n_created = 0

    with get_db() as conn:
        cur = conn.cursor()

        # 1. Buscar en ARGUMENTOS
        if "argumentos" in fuentes:
            where_parts: list[str] = []
            params: list = []

            if since:
                where_parts.append("p.fecha >= %s::date")
                params.append(since)

            if partidos:
                clause, _ = _partido_where_for_column("a.partido", partidos)
                if clause:
                    where_parts.append(clause)

            if temas:
                where_parts.append("p.tema = ANY(%s)")
                params.append(temas)

            # Palabras clave: match en argumento
            keyword_sources: list[tuple[str, list]] = []
            if palabras:
                kc, kp = _build_keyword_clause("a.argumento", palabras)
                if kc:
                    keyword_sources.append((kc, kp))
            if concejales:
                cc, cp = _build_concejal_clause("a.argumento", concejales)
                if cc:
                    keyword_sources.append((cc, cp))
            # Si hay palabras o concejales, al menos uno debe coincidir
            if keyword_sources:
                combined = " OR ".join(k[0] for k in keyword_sources)
                where_parts.append(f"({combined})")
                for _, p in keyword_sources:
                    params.extend(p)

            if municipios:
                where_parts.append("p.municipio_id = ANY(%s)")
                params.append(municipios)

            if not where_parts:
                # sin filtros no hacemos nada
                pass
            else:
                sql = f"""
                    SELECT a.id as arg_id, a.partido, a.argumento,
                           p.id as punto_id, p.titulo, p.tema, p.fecha,
                           m.id as municipio_id, m.nombre as municipio
                    FROM argumentos a
                    JOIN puntos_pleno p ON a.punto_id = p.id
                    JOIN municipios m ON p.municipio_id = m.id
                    WHERE {' AND '.join(where_parts)}
                      AND LENGTH(a.argumento) >= 20
                    ORDER BY p.fecha DESC
                    LIMIT 50
                """
                cur.execute(sql, params)
                for row in cur.fetchall():
                    arg_id, partido, argumento, punto_id, titulo, tema, fecha, muni_id, muni = row
                    desc_parts = []
                    if partido:
                        desc_parts.append(f"**{partido}**")
                    desc_parts.append(f"«{(argumento or '')[:180]}»")
                    desc = " ".join(desc_parts)
                    titulo_alerta = f"{regla['nombre']} — {muni} · {fecha}"
                    if _insert_alerta(cur, regla, punto_id, muni_id, titulo_alerta, desc,
                                      contexto={"argumento_id": arg_id, "partido": partido,
                                                "tema": tema, "punto_titulo": titulo}):
                        n_created += 1

        # 2. Buscar en PUNTOS (título/resumen) — útil para temas sin argumentos
        if "puntos" in fuentes:
            where_parts_p: list[str] = []
            params_p: list = []
            if since:
                where_parts_p.append("p.fecha >= %s::date")
                params_p.append(since)
            if temas:
                where_parts_p.append("p.tema = ANY(%s)")
                params_p.append(temas)
            if municipios:
                where_parts_p.append("p.municipio_id = ANY(%s)")
                params_p.append(municipios)
            # palabras/concejales en resumen o título
            kw_or: list[str] = []
            kw_par: list = []
            for term_list in (palabras, concejales):
                for t in term_list:
                    kw_or.append("(p.resumen ILIKE %s OR p.titulo ILIKE %s)")
                    kw_par.extend([f"%{t}%", f"%{t}%"])
            if kw_or:
                where_parts_p.append("(" + " OR ".join(kw_or) + ")")
                params_p.extend(kw_par)

            # Si no hay filtro de tema ni keyword, evitamos ejecutar (alerta de "cualquier punto")
            if where_parts_p and (temas or palabras or concejales):
                sql = f"""
                    SELECT p.id as punto_id, p.titulo, p.tema, p.fecha, p.resumen,
                           m.id as municipio_id, m.nombre as municipio
                    FROM puntos_pleno p
                    JOIN municipios m ON p.municipio_id = m.id
                    WHERE {' AND '.join(where_parts_p)}
                    ORDER BY p.fecha DESC LIMIT 50
                """
                cur.execute(sql, params_p)
                for row in cur.fetchall():
                    punto_id, titulo, tema, fecha, resumen, muni_id, muni = row
                    desc = (resumen or titulo or "")[:300]
                    titulo_alerta = f"{regla['nombre']} — {muni} · {fecha}"
                    if _insert_alerta(cur, regla, punto_id, muni_id, titulo_alerta, desc,
                                      contexto={"tema": tema, "punto_titulo": titulo}):
                        n_created += 1

        # Actualizar timestamps de la regla
        cur.execute("""
            UPDATE alertas_reglas
            SET last_run_at = NOW(),
                last_match_at = CASE WHEN %s > 0 THEN NOW() ELSE last_match_at END,
                match_count = match_count + %s
            WHERE id = %s
        """, (n_created, n_created, regla["id"]))

    logger.info(f"regla {regla['id']} ({regla['nombre']}) → {n_created} alertas nuevas")
    return n_created


def run_all_active_rules() -> dict:
    """Recorre todas las reglas activas y las evalúa. Útil para cron periódico."""
    from psycopg2.extras import RealDictCursor
    total_alertas = 0
    reglas_evaluadas = 0
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM alertas_reglas WHERE activa = TRUE ORDER BY id")
        reglas = cur.fetchall()

    for regla in reglas:
        try:
            n = evaluate_regla(dict(regla))
            total_alertas += n
            reglas_evaluadas += 1
        except Exception as e:
            logger.exception(f"error evaluando regla {regla['id']}: {e}")

    return {
        "reglas_evaluadas": reglas_evaluadas,
        "alertas_creadas": total_alertas,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
