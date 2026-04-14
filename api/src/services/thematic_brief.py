"""Genera briefs temáticos personalizados a partir de una subscripción."""

import os
from datetime import date, timedelta
from psycopg2.extras import RealDictCursor
from openai import OpenAI

from ..db import get_db

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

THEMATIC_BRIEF_PROMPT = """Eres jefe de gabinete analítico para un partido catalán.
Genera un brief semanal sobre los temas indicados, dirigido a un cargo ocupado.

ESTRUCTURA OBLIGATORIA:
1. **Titular en 1 frase** (qué pasó esta semana en estos temas).
2. **Movimientos clave** (3-5 bullets con: municipio, qué votaron, resultado, cifra).
3. **Eco social** (si hay datos, sentimiento agregado en redes; si no, omitir).
4. **Riesgos / oportunidades** (1-3 lecturas accionables).
5. **Qué vigilar la semana que viene** (1-2 puntos).

REGLAS:
- Idioma: catalán salvo que los datos estén mayoritariamente en español.
- Tono: ejecutivo, conclusivo, sin paja.
- Cifras siempre con contexto (vs semana anterior, vs media).
- No inventes. Si no hay datos suficientes en un bloque, marca "Sense activitat".
- Máximo 350 palabras.
"""


def _gather_data(temas: list[str], municipios: list[int], days: int = 7) -> dict:
    end = date.today()
    start = end - timedelta(days=days)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        params: list = [start, end]
        sql = """
            SELECT p.titulo, p.resumen, p.tema, p.resultado, p.fecha,
                   m.nombre AS municipio, m.comarca
            FROM puntos_pleno p
            JOIN municipios m ON m.id = p.municipio_id
            WHERE p.fecha BETWEEN %s AND %s
        """
        if temas:
            sql += " AND p.tema = ANY(%s)"
            params.append(temas)
        if municipios:
            sql += " AND p.municipio_id = ANY(%s)"
            params.append(municipios)
        sql += " ORDER BY p.fecha DESC LIMIT 50"
        cur.execute(sql, params)
        puntos = cur.fetchall()

        cur.execute(
            """SELECT tema, sentiment, COUNT(*) AS n
               FROM mencion_social
               WHERE publicado_at >= %s
                 AND (%s::text[] IS NULL OR tema = ANY(%s))
               GROUP BY tema, sentiment""",
            (start, temas or None, temas or [])
        )
        social = cur.fetchall()

        cur.execute(
            """SELECT a.tipo, a.severidad, a.titulo, a.created_at, m.nombre AS municipio
               FROM alertas a LEFT JOIN municipios m ON m.id = a.municipio_id
               WHERE a.created_at >= %s ORDER BY a.created_at DESC LIMIT 20""",
            (start,)
        )
        alertas = cur.fetchall()

    return {"puntos": puntos, "social": social, "alertas": alertas, "rango": [str(start), str(end)]}


FREE_BRIEF_PROMPT = """Eres jefe de gabinete analítico para Aliança Catalana.
El usuario ha configurado una subscripción con una CONSULTA LIBRE en lenguaje natural.
Tu misión: generar un brief ejecutivo que responda a esa consulta con los datos recopilados.

ESTRUCTURA OBLIGATORIA:
1. **Titular en 1 frase** que resuma lo relevante de la semana sobre la consulta.
2. **Moviments clau** (3-5 bullets con municipi + xifra + font).
3. **Eco social** (sentiment agregado si hay; si no, "Sense activitat").
4. **Riscos / oportunitats** (1-3 lectures accionables per AC).
5. **Què vigilar la setmana que ve**.

REGLAS:
- Idioma: catalán salvo que los datos estén mayoritariamente en español.
- Tono ejecutivo, conclusivo, sin paja. Máximo 350 palabras.
- No inventes. Si los datos no cubren la consulta, dilo en 1 línea.
- Cifras con contexto.
"""


def _gather_data_free(prompt: str, days: int = 7) -> dict:
    """Usa el router de /chat para traducir el prompt a tool calls y recopilar datos."""
    from ..routes.chat import TOOL_MAP, ROUTER_PROMPT, get_llm, _extract_json
    import json as _json

    client = get_llm()
    try:
        r = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": ROUTER_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            max_tokens=500,
        )
        plan = _extract_json(r.choices[0].message.content) or {}
    except Exception:
        plan = {}

    results = []
    for tc in (plan.get("tools") or [])[:5]:
        name = tc.get("name", "")
        args = tc.get("args", {})
        fn = TOOL_MAP.get(name)
        if not fn:
            continue
        try:
            out = fn(args)
            results.append({"tool": name, "args": args, "data": out[:4000]})
        except Exception:
            continue

    end = date.today()
    start = end - timedelta(days=days)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT a.tipo, a.severidad, a.titulo, a.created_at, m.nombre AS municipio
               FROM alertas a LEFT JOIN municipios m ON m.id = a.municipio_id
               WHERE a.created_at >= %s ORDER BY a.created_at DESC LIMIT 15""",
            (start,),
        )
        alertas = cur.fetchall()
    return {"tools": results, "alertas": alertas, "rango": [str(start), str(end)]}


def generate_brief_for_subscripcion(sub_id: int, dry_run: bool = False) -> str:
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM subscripciones WHERE id = %s", (sub_id,))
        sub = cur.fetchone()
    if not sub:
        return "Subscripción no encontrada."

    prompt_libre = (sub.get("prompt_libre") or "").strip()

    if prompt_libre:
        import json
        data = _gather_data_free(prompt_libre)
        if not data["tools"] and not data["alertas"]:
            return f"Sense activitat relacionada amb «{prompt_libre}» aquesta setmana."
        client = OpenAI(base_url=PROXY_URL, api_key="subscription", timeout=120.0)
        payload = {
            "subscripcion": {"nombre": sub["nombre"], "consulta": prompt_libre, "rango": data["rango"]},
            "resultats_tools": data["tools"],
            "alertes_recents": data["alertas"][:8],
        }
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": FREE_BRIEF_PROMPT},
                {"role": "user", "content": f"Consulta: {prompt_libre}\n\nDades:\n"
                                             + json.dumps(payload, ensure_ascii=False, default=str)[:16000]},
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        brief = resp.choices[0].message.content or ""
        if not dry_run:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("UPDATE subscripciones SET last_sent_at = NOW() WHERE id = %s", (sub_id,))
        return brief

    data = _gather_data(sub["temas"] or [], sub["municipios"] or [])
    if not data["puntos"] and not data["social"]:
        return f"Sense activitat als temes {sub['temas']} aquesta setmana."

    client = OpenAI(base_url=PROXY_URL, api_key="subscription", timeout=120.0)
    payload = {
        "subscripcion": {"nombre": sub["nombre"], "temas": sub["temas"], "rango": data["rango"]},
        "puntos": data["puntos"][:30],
        "social_agregado": data["social"],
        "alertas_recientes": data["alertas"][:10],
    }
    import json
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": THEMATIC_BRIEF_PROMPT},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False, default=str)},
        ],
        temperature=0.3,
        max_tokens=1500,
    )
    brief = resp.choices[0].message.content or ""

    if not dry_run:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE subscripciones SET last_sent_at = NOW() WHERE id = %s", (sub_id,))

    return brief
