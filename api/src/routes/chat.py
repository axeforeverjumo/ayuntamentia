"""Chat con tool-use manual — el LLM decide qué buscar via JSON."""

import os
import json
import re
import time
from typing import Optional
from openai import OpenAI
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from ..db import get_cursor
from ..auth import CurrentUser, get_optional_user, log_usage

router = APIRouter()

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

ROUTER_PROMPT = """Eres un router. El usuario pregunta sobre política municipal de Catalunya.
Decide qué herramientas usar. Responde SOLO con JSON.

Herramientas:
1. buscar_actas(query) — busca texto libre en actas de plenos municipales
2. buscar_votaciones(partido) — historial de votaciones. Valores: AC, ERC, PSC, CUP, JxCat, PP, VOX, Cs
3. info_municipio(nombre) — composición pleno, concejales, plenos, temas
4. estadisticas() — stats generales del sistema
5. buscar_argumentos(query) — intervenciones y argumentos en debates
6. buscar_por_tema(tema) — puntos por tema: urbanismo, hacienda, seguridad, medio_ambiente, cultura, transporte, servicios_sociales, vivienda, educacion, salud, comercio, mociones
7. comparar_partidos(partido1, partido2) — compara votaciones de 2 partidos
8. elecciones_municipio(nombre) — resultados electorales históricos (desde 1979) de un municipio
9. historial_alcaldes(nombre) — todos los alcaldes de un municipio desde 1979
10. mociones_govern(query) — mociones municipales dirigidas al Govern de la Generalitat
11. presupuesto_municipio(nombre) — presupuestos por año de un municipio
12. poblacion_municipio(nombre) — evolución demográfica histórica
13. iniciativas_parlament(query) — iniciativas parlamentarias (propuestas, mociones, interpelaciones)
14. recepcion_social(tema?, municipio?, dias?) — eco social (RSS prensa, Bluesky) por tema/municipio
15. tendencias_emergentes() — temas con mayor crecimiento en plenos últimos 30 días
16. ranking_concejales(partido?, municipio?) — ranking de alineación de concejales con la línea del partido

Puedes pedir VARIAS herramientas.

Ejemplos:
- "que hablan de aliança catalana?" → {"tools": [{"name": "buscar_votaciones", "args": {"partido": "AC"}}, {"name": "buscar_actas", "args": {"query": "Aliança Catalana"}}]}
- "hola" → {"tools": [], "direct_answer": "Hola! Sóc AyuntamentIA, el teu assistent de política municipal. Pregunta'm sobre plens, votacions, eleccions o qualsevol cosa de Catalunya!"}
- "historia política de Ripoll" → {"tools": [{"name": "historial_alcaldes", "args": {"nombre": "Ripoll"}}, {"name": "elecciones_municipio", "args": {"nombre": "Ripoll"}}, {"name": "info_municipio", "args": {"nombre": "Ripoll"}}]}
- "presupuesto de Girona" → {"tools": [{"name": "presupuesto_municipio", "args": {"nombre": "Girona"}}]}
- "mociones sobre inmigración" → {"tools": [{"name": "mociones_govern", "args": {"query": "immigració immigracion"}}]}
- "que se debate sobre urbanismo?" → {"tools": [{"name": "buscar_por_tema", "args": {"tema": "urbanismo"}}]}
- "radiografía de Manlleu" → {"tools": [{"name": "info_municipio", "args": {"nombre": "Manlleu"}}, {"name": "historial_alcaldes", "args": {"nombre": "Manlleu"}}, {"name": "elecciones_municipio", "args": {"nombre": "Manlleu"}}, {"name": "presupuesto_municipio", "args": {"nombre": "Manlleu"}}, {"name": "poblacion_municipio", "args": {"nombre": "Manlleu"}}]}
- "que pasa en el parlament sobre vivienda?" → {"tools": [{"name": "iniciativas_parlament", "args": {"query": "habitatge vivienda"}}]}
- "gracias" → {"tools": [], "direct_answer": "De res! Si tens més preguntes, aquí estic."}

Responde SOLO JSON."""

ANSWER_PROMPT = """Eres AyuntamentIA, jefe de gabinete analítico para política municipal catalana.
Hablas a un político ocupado: dale CONCLUSIONES, no listados crudos.

PRIORIDAD ABSOLUTA — MODO ANÁLISIS:
1. Empieza con un **veredicto en 1-2 frases** que responda directamente a la pregunta.
2. Después, máximo 3-5 puntos clave que sustentan el veredicto (con cifras concretas).
3. Termina con un "**¿Y ahora qué?**" — implicación accionable o riesgo a vigilar.

REGLAS DE FORMA:
- Idioma: el de la pregunta (catalán o español).
- Evita listados largos y volcados de datos. Si hay muchas filas, dame el patrón, no el dump.
- Cifras siempre con contexto (% o comparativa).
- Cita municipio + fecha solo cuando refuerce la conclusión.
- Si los datos no permiten conclusión, dilo en 1 línea y propón qué preguntar.
- Markdown limitado: títulos solo si la respuesta supera 200 palabras.

REGLAS DE FONDO:
- Detecta patrones cross-municipio (incoherencias, alineaciones, tendencias).
- Señala oportunidades comunicativas o riesgos políticos.
- No inventes. Si una cifra no está en los datos, no la digas.
- Lectura útil en <30 segundos."""


def get_llm():
    return OpenAI(base_url=PROXY_URL, api_key="subscription")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


# === Tools ===

def tool_buscar_actas(query: str) -> str:
    words = re.findall(r'\w{3,}', query)
    if not words:
        return "[]"
    tsquery = " | ".join(words[:8])
    with get_cursor() as cur:
        cur.execute("""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object('partido', v.partido, 'sentido', v.sentido))
                       FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            JOIN actas a ON p.acta_id = a.id
            WHERE a.tsv @@ to_tsquery('spanish', %s)
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC LIMIT 15
        """, (tsquery,))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_buscar_votaciones(partido: str) -> str:
    p = partido.upper().strip()
    if p in ("AC", "ALIANÇA", "ALIANÇA CATALANA", "ALIANÇA.CAT"):
        where = "(v.partido = 'AC' OR v.partido = 'ALIANÇA.CAT' OR v.partido LIKE 'AC-%' OR v.partido = 'ERC-AC')"
    elif p == "ERC":
        where = "(v.partido ILIKE '%ERC%' AND v.partido NOT LIKE '%ERC-AC%')"
    else:
        where = f"v.partido ILIKE '%%{partido}%%'"

    with get_cursor() as cur:
        cur.execute(f"""
            SELECT v.partido, v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, p.resumen
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} ORDER BY p.fecha DESC LIMIT 30
        """)
        rows = cur.fetchall()
        cur.execute(f"SELECT v.sentido, COUNT(*) as n FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id WHERE {where} GROUP BY v.sentido")
        stats = {s["sentido"]: s["n"] for s in cur.fetchall()}
        cur.execute(f"SELECT DISTINCT m.nombre, COUNT(v.id) as votos FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id JOIN municipios m ON p.municipio_id = m.id WHERE {where} GROUP BY m.nombre ORDER BY votos DESC")
        municipios = [dict(m) for m in cur.fetchall()]
        cur.execute(f"SELECT p.tema, COUNT(*) as n FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id WHERE {where} AND p.tema IS NOT NULL GROUP BY p.tema ORDER BY n DESC LIMIT 8")
        temas = [dict(t) for t in cur.fetchall()]
    return json.dumps({"partido": partido, "total": sum(stats.values()), "resumen": stats,
                        "municipios": municipios, "temas": temas,
                        "detalle": [dict(r) for r in rows]}, default=str, ensure_ascii=False)


def tool_info_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM municipios WHERE nombre ILIKE %s LIMIT 1", (f"%{nombre}%",))
        mun = cur.fetchone()
        if not mun:
            return json.dumps({"error": f"No trobat: {nombre}"})
        mid = mun["id"]
        cur.execute("SELECT partido, COUNT(*) as n FROM cargos_electos WHERE municipio_id=%s AND activo GROUP BY partido ORDER BY n DESC", (mid,))
        comp = cur.fetchall()
        cur.execute("SELECT a.fecha, a.tipo, (SELECT COUNT(*) FROM puntos_pleno p WHERE p.acta_id=a.id) as puntos FROM actas a WHERE a.municipio_id=%s AND a.status='structured' ORDER BY a.fecha DESC LIMIT 5", (mid,))
        plenos = cur.fetchall()
        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE municipio_id=%s AND tema IS NOT NULL GROUP BY tema ORDER BY n DESC LIMIT 8", (mid,))
        temas = cur.fetchall()
        cur.execute("SELECT nombre, cargo, partido FROM cargos_electos WHERE municipio_id=%s AND activo AND UPPER(partido) LIKE '%%ALIAN%%' ORDER BY nombre", (mid,))
        ac_concejales = cur.fetchall()
    return json.dumps({"nombre": mun["nombre"], "comarca": mun["comarca"], "provincia": mun["provincia"],
                        "poblacion": mun["poblacion"], "tiene_ac": mun["tiene_ac"],
                        "composicion": [dict(c) for c in comp], "plenos": [dict(p) for p in plenos],
                        "temas": [dict(t) for t in temas], "concejales_ac": [dict(c) for c in ac_concejales]},
                       default=str, ensure_ascii=False)


def tool_estadisticas() -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM dashboard_stats")
        stats = dict(cur.fetchone()) if cur.rowcount else {}
        cur.execute("SELECT status, COUNT(*) as n FROM actas GROUP BY status ORDER BY n DESC")
        pipeline = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE tema IS NOT NULL AND tema != 'procedimiento' GROUP BY tema ORDER BY n DESC LIMIT 10")
        temas = [dict(r) for r in cur.fetchall()]
    return json.dumps({"stats": stats, "pipeline": pipeline, "temas": temas}, default=str, ensure_ascii=False)


def tool_buscar_argumentos(query: str) -> str:
    words = re.findall(r'\w{3,}', query)
    if not words:
        return "[]"
    like_clauses = " OR ".join(["a.argumento ILIKE %s"] * min(4, len(words)))
    params = [f"%{w}%" for w in words[:4]]
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT a.partido, a.posicion, a.argumento, p.titulo, p.tema, p.fecha,
                   m.nombre as municipio
            FROM argumentos a
            JOIN puntos_pleno p ON a.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {like_clauses}
            ORDER BY p.fecha DESC LIMIT 15
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_buscar_por_tema(tema: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object('partido', v.partido, 'sentido', v.sentido))
                       FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            WHERE p.tema = %s
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC LIMIT 20
        """, (tema,))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_comparar_partidos(partido1: str, partido2: str) -> str:
    r1 = tool_buscar_votaciones(partido1)
    r2 = tool_buscar_votaciones(partido2)
    return json.dumps({"partido1": json.loads(r1), "partido2": json.loads(r2)}, ensure_ascii=False)


def tool_elecciones_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT anyo, partido, votos, porcentaje, concejales
            FROM elecciones WHERE municipio ILIKE %s
            ORDER BY anyo DESC, votos DESC
        """, (f"%{nombre}%",))
        rows = cur.fetchall()
    return json.dumps([dict(r) for r in rows], default=str, ensure_ascii=False)


def tool_historial_alcaldes(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT nombre, partido, legislatura, fecha_posesion
            FROM alcaldes WHERE municipio ILIKE %s
            ORDER BY legislatura DESC
        """, (f"%{nombre}%",))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_mociones_govern(query: str) -> str:
    words = re.findall(r'\w{3,}', query)
    if not words:
        return "[]"
    like_clauses = " OR ".join(["titulo ILIKE %s"] * min(4, len(words)))
    params = [f"%{w}%" for w in words[:4]]
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT titulo, municipio, vegueria, fecha, tema
            FROM mociones WHERE {like_clauses}
            ORDER BY fecha DESC LIMIT 20
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_presupuesto_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT anyo, tipo, total FROM presupuestos
            WHERE municipio ILIKE %s ORDER BY anyo DESC, tipo
        """, (f"%{nombre}%",))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_poblacion_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT anyo, total, hombres, mujeres FROM poblacion
            WHERE municipio ILIKE %s ORDER BY anyo DESC
        """, (f"%{nombre}%",))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_recepcion_social(tema: str = "", municipio: str = "", dias: int = 14) -> str:
    where, params = ["publicado_at >= NOW() - (%s || ' days')::interval"], [str(dias)]
    if tema:
        where.append("tema = %s")
        params.append(tema)
    if municipio:
        where.append("municipio_id = (SELECT id FROM municipios WHERE LOWER(nombre)=LOWER(%s) LIMIT 1)")
        params.append(municipio)
    sql = f"""SELECT tema, sentiment, COUNT(*) AS n, SUM(engagement) AS engagement_total
              FROM mencion_social WHERE {' AND '.join(where)}
              GROUP BY tema, sentiment ORDER BY n DESC LIMIT 30"""
    with get_cursor() as cur:
        cur.execute(sql, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_tendencias_emergentes() -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM v_tendencias_emergentes LIMIT 15")
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_ranking_concejales(partido: str = "", municipio: str = "", limit: int = 20) -> str:
    where, params = ["votos_total >= 5"], []
    if partido:
        where.append("partido = %s")
        params.append(partido)
    if municipio:
        where.append("LOWER(municipio) ILIKE LOWER(%s)")
        params.append(f"%{municipio}%")
    sql = f"""SELECT nombre, partido, municipio, votos_total, pct_alineacion, divergencias
              FROM v_ranking_concejales WHERE {' AND '.join(where)}
              ORDER BY pct_alineacion ASC LIMIT %s"""
    params.append(limit)
    with get_cursor() as cur:
        cur.execute(sql, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_iniciativas_parlament(query: str) -> str:
    words = re.findall(r'\w{3,}', query)
    if not words:
        return "[]"
    like_clauses = " OR ".join(["titulo ILIKE %s"] * min(4, len(words)))
    params = [f"%{w}%" for w in words[:4]]
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT tipo, numero, titulo, proponentes, grupo, fecha
            FROM iniciativas_parlament WHERE {like_clauses}
            ORDER BY fecha DESC LIMIT 15
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


TOOL_MAP = {
    "buscar_actas": lambda a: tool_buscar_actas(a.get("query", "")),
    "buscar_votaciones": lambda a: tool_buscar_votaciones(a.get("partido", "")),
    "info_municipio": lambda a: tool_info_municipio(a.get("nombre", "")),
    "estadisticas": lambda a: tool_estadisticas(),
    "buscar_argumentos": lambda a: tool_buscar_argumentos(a.get("query", "")),
    "buscar_por_tema": lambda a: tool_buscar_por_tema(a.get("tema", "")),
    "comparar_partidos": lambda a: tool_comparar_partidos(a.get("partido1", ""), a.get("partido2", "")),
    "elecciones_municipio": lambda a: tool_elecciones_municipio(a.get("nombre", "")),
    "historial_alcaldes": lambda a: tool_historial_alcaldes(a.get("nombre", "")),
    "mociones_govern": lambda a: tool_mociones_govern(a.get("query", "")),
    "presupuesto_municipio": lambda a: tool_presupuesto_municipio(a.get("nombre", "")),
    "poblacion_municipio": lambda a: tool_poblacion_municipio(a.get("nombre", "")),
    "iniciativas_parlament": lambda a: tool_iniciativas_parlament(a.get("query", "")),
    "recepcion_social": lambda a: tool_recepcion_social(a.get("tema", ""), a.get("municipio", ""), int(a.get("dias", 14))),
    "tendencias_emergentes": lambda a: tool_tendencias_emergentes(),
    "ranking_concejales": lambda a: tool_ranking_concejales(a.get("partido", ""), a.get("municipio", ""), int(a.get("limit", 20))),
}


def _extract_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r'\{[\s\S]*\}', text)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return None


@router.post("/")
def chat(
    req: ChatRequest,
    request: Request,
    user: Optional[CurrentUser] = Depends(get_optional_user),
):
    t0 = time.time()
    client = get_llm()
    sources = []

    # Step 1: Route — LLM decides tools
    router_msgs = [{"role": "system", "content": ROUTER_PROMPT}]
    user_input = req.message
    if req.history and len(req.message.split()) < 8:
        prev = " | ".join(h.get("content", "")[:100] for h in req.history[-3:] if h.get("role") == "user")
        user_input = f"Historial: {prev}\nPregunta actual: {req.message}"
    router_msgs.append({"role": "user", "content": user_input})

    try:
        r1 = client.chat.completions.create(model=MODEL, messages=router_msgs, temperature=0, max_tokens=500)
        plan = _extract_json(r1.choices[0].message.content)
    except Exception:
        plan = None

    if plan and plan.get("direct_answer"):
        return {"answer": plan["direct_answer"], "sources": []}

    # Step 2: Execute tools
    tool_results = []
    if plan and plan.get("tools"):
        for tc in plan["tools"]:
            name = tc.get("name", "")
            args = tc.get("args", {})
            fn = TOOL_MAP.get(name)
            if fn:
                try:
                    result = fn(args)
                    tool_results.append(f"[{name}({json.dumps(args, ensure_ascii=False)})]:\n{result}")
                    # Extract sources
                    parsed = json.loads(result) if isinstance(result, str) else result
                    items = parsed if isinstance(parsed, list) else (parsed.get("detalle") or parsed.get("votaciones") or [])
                    for item in items[:5]:
                        if isinstance(item, dict) and item.get("municipio"):
                            src = {"municipio": item["municipio"], "fecha": str(item.get("fecha", "")),
                                   "tema": item.get("tema"), "titulo": item.get("titulo")}
                            if src not in sources:
                                sources.append(src)
                except Exception:
                    pass

    if not tool_results:
        result = tool_buscar_actas(req.message)
        tool_results.append(f"[buscar_actas fallback]:\n{result}")

    # Step 3: Answer with data
    data = "\n\n---\n\n".join(tool_results)
    msgs = [{"role": "system", "content": ANSWER_PROMPT}]
    for h in req.history[-6:]:
        msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    msgs.append({"role": "user", "content": f"Dades consultades:\n\n{data[:12000]}\n\nPregunta: {req.message}"})

    try:
        r2 = client.chat.completions.create(model=MODEL, messages=msgs, temperature=0.3, max_tokens=4000)
        answer = r2.choices[0].message.content
    except Exception as e:
        answer = f"Error: {str(e)[:300]}\n\nDades trobades:\n{data[:2000]}"

    log_usage(
        user, "chat_query",
        payload={"message": req.message[:500]},
        response_meta={
            "tools_used": [t.get("name") for t in (plan.get("tools") if plan else []) or []],
            "n_sources": len(sources),
            "latency_ms": int((time.time() - t0) * 1000),
        },
        request=request,
    )
    return {"answer": answer or "Sense resposta.", "sources": sources[:5]}
