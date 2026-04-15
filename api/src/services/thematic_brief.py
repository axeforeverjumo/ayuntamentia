"""Genera briefs temáticos personalizados a partir de una subscripción."""

import os
from datetime import date, timedelta
from psycopg2.extras import RealDictCursor
from openai import OpenAI

from ..db import get_db

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

THEMATIC_BRIEF_PROMPT = """Eres jefe de gabinete analítico para un partido catalán.
Genera un brief sobre los temas indicados, dirigido a un cargo ocupado.

FORMATO MARKDOWN OBLIGATORIO (usa estos títulos literales como H2):

## Titular
Una sola frase contundente que resuma lo relevante del período.

## Moviments clau
- Entre 3 y 5 bullets. CADA bullet debe contener: municipi · qué es votó · resultat · xifra o data.
- Si el bloque de datos no tiene puntos reales, escribe EXACTAMENTE una única línea: *Sense activitat en aquest període.* (no repitas 3 veces "Sense activitat").

## Eco social
Agregado en redes/prensa: N mencions, % sentiment positiu/negatiu, temes dominants. Si no hay datos, una sola línea: *Sense mencions socials en aquest període.*

## Riscos i oportunitats
- 1-3 bullets amb lectures accionables per a la direcció.

## Què vigilar la setmana vinent
- 1-2 bullets concrets (tema + per què).

REGLAS:
- Idioma: català salvo que los datos estén mayoritariamente en castellano.
- Tono executiu, conclusiu. Sin paja ni frases vacías.
- Xifres sempre amb context (vs mitjana, vs període anterior).
- No inventis. Si no hi ha dades, marca una sola línia "Sense activitat" per bloc (mai repetida).
- Máximo 350 paraules totals.
- Usa **negreta** per destacar municipis i xifres clau.
"""


FREE_BRIEF_PROMPT = """Eres jefe de gabinete analítico para Aliança Catalana.
El usuario configuró una CONSULTA LIBRE en lenguaje natural.
Responde a esa consulta en formato markdown con esta estructura literal (usa H2):

## Titular
Una sola frase que resuma el hallazgo clave sobre la consulta del usuario.

## Moviments clau
- 3-5 bullets amb municipi/actor · què ha passat · xifra/data. Si no hi ha dades: una única línia *Sense activitat*.

## Eco social
Mencions agregades, sentiment, fonts. Si no hi ha dades: una única línia.

## Riscos i oportunitats
- 1-3 lectures accionables per AC.

## Què vigilar la setmana vinent
- 1-2 bullets concrets.

REGLAS: català; executiu; sense paja; xifres amb context; no inventis; negreta per municipis/xifres; màx 350 paraules.
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
    ventana = int(sub.get("ventana_dias") or 7)

    if prompt_libre:
        import json
        data = _gather_data_free(prompt_libre, days=ventana)
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

    data = _gather_data(sub["temas"] or [], sub["municipios"] or [], days=ventana)
    if not data["puntos"] and not data["social"]:
        return (f"## Titular\n*Sense activitat als temes {', '.join(sub['temas'] or [])} "
                f"en els darrers {ventana} dies.*\n\n"
                "## Moviments clau\n*Sense activitat en aquest període.*\n\n"
                "## Eco social\n*Sense mencions socials en aquest període.*\n\n"
                "## Riscos i oportunitats\n*Cap senyal detectat.*\n\n"
                "## Què vigilar la setmana vinent\n*Ampliar temes o finestra temporal.*")

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
