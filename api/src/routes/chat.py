"""Chat con tool-use manual — el LLM decide qué buscar via JSON."""

import os
import json
import re
from openai import OpenAI
from fastapi import APIRouter
from pydantic import BaseModel
from ..db import get_cursor

router = APIRouter()

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

ROUTER_PROMPT = """Eres un router inteligente. El usuario hace una pregunta sobre política municipal de Catalunya.
Tienes 4 herramientas de búsqueda. Decide cuál(es) usar y responde SOLO con JSON:

Herramientas:
1. buscar_actas(query) — busca texto en actas de plenos. Usa keywords relevantes.
2. buscar_votaciones(partido) — busca votaciones de un partido. Valores: AC, ERC, PSC, CUP, JxCat, PP, VOX
3. info_municipio(nombre) — info completa de un municipio
4. estadisticas() — stats generales del sistema

Responde SOLO con JSON así (puedes pedir varias):
{"tools": [{"name": "buscar_votaciones", "args": {"partido": "AC"}}, {"name": "buscar_actas", "args": {"query": "Ripoll urbanisme"}}]}

Si la pregunta es un saludo o no necesita búsqueda:
{"tools": [], "direct_answer": "Hola! Sóc AyuntamentIA..."}"""

ANSWER_PROMPT = """Eres AyuntamentIA, asistente de inteligencia política municipal de Catalunya.
Responde la pregunta del usuario usando SOLO los datos proporcionados.
- Cita siempre municipio y fecha.
- Si preguntan por un partido, resume: total votaciones, cuántas a favor/contra/abstencion, en qué municipios, en qué temas.
- Usa markdown.
- Responde en el idioma de la pregunta.
- Si no hay datos suficientes, dilo y sugiere reformular."""


def get_llm():
    return OpenAI(base_url=PROXY_URL, api_key="subscription")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


# === Tool implementations ===

def tool_buscar_actas(query: str) -> str:
    words = re.findall(r'\w{3,}', query)
    if not words:
        return json.dumps({"results": []})
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
    else:
        where = f"v.partido ILIKE '%%{partido}%%'"

    with get_cursor() as cur:
        cur.execute(f"""
            SELECT v.partido, v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, p.resumen
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where}
            ORDER BY p.fecha DESC LIMIT 30
        """)
        rows = cur.fetchall()
        cur.execute(f"""
            SELECT v.sentido, COUNT(*) as n FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            WHERE {where} GROUP BY v.sentido
        """)
        stats = {s["sentido"]: s["n"] for s in cur.fetchall()}
        cur.execute(f"""
            SELECT DISTINCT m.nombre, COUNT(v.id) as votos FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} GROUP BY m.nombre ORDER BY votos DESC
        """)
        municipios = [dict(m) for m in cur.fetchall()]
    return json.dumps({"partido": partido, "total": sum(stats.values()), "stats": stats,
                        "municipios": municipios, "votaciones": [dict(r) for r in rows]},
                       default=str, ensure_ascii=False)


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
    return json.dumps({"nombre": mun["nombre"], "comarca": mun["comarca"], "provincia": mun["provincia"],
                        "poblacion": mun["poblacion"], "tiene_ac": mun["tiene_ac"],
                        "composicion": [dict(c) for c in comp], "plenos": [dict(p) for p in plenos],
                        "temas": [dict(t) for t in temas]}, default=str, ensure_ascii=False)


def tool_estadisticas() -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM dashboard_stats")
        stats = dict(cur.fetchone()) if cur.rowcount else {}
        cur.execute("SELECT status, COUNT(*) as n FROM actas GROUP BY status ORDER BY n DESC")
        pipeline = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE tema IS NOT NULL AND tema != 'procedimiento' GROUP BY tema ORDER BY n DESC LIMIT 10")
        temas = [dict(r) for r in cur.fetchall()]
    return json.dumps({"stats": stats, "pipeline": pipeline, "temas": temas}, default=str, ensure_ascii=False)


TOOL_MAP = {
    "buscar_actas": lambda a: tool_buscar_actas(a.get("query", "")),
    "buscar_votaciones": lambda a: tool_buscar_votaciones(a.get("partido", "")),
    "info_municipio": lambda a: tool_info_municipio(a.get("nombre", "")),
    "estadisticas": lambda a: tool_estadisticas(),
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
def chat(req: ChatRequest):
    client = get_llm()
    sources = []

    # Step 1: Ask LLM what tools to use
    router_msgs = [
        {"role": "system", "content": ROUTER_PROMPT},
        {"role": "user", "content": req.message},
    ]
    # Include history context for short queries
    if req.history and len(req.message.split()) < 8:
        prev = " | ".join(h.get("content", "")[:100] for h in req.history[-3:] if h.get("role") == "user")
        router_msgs[-1]["content"] = f"Historial: {prev}\nPregunta actual: {req.message}"

    try:
        r1 = client.chat.completions.create(model=MODEL, messages=router_msgs, temperature=0, max_tokens=500)
        plan = _extract_json(r1.choices[0].message.content)
    except Exception as e:
        plan = None

    # Direct answer (greeting etc)
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
                result = fn(args)
                tool_results.append(f"[{name}({json.dumps(args, ensure_ascii=False)})]:\n{result}")

                # Extract sources
                try:
                    parsed = json.loads(result)
                    items = parsed if isinstance(parsed, list) else (parsed.get("votaciones") or parsed.get("results") or [])
                    for item in items[:5]:
                        if isinstance(item, dict) and item.get("municipio"):
                            src = {"municipio": item["municipio"], "fecha": str(item.get("fecha", "")),
                                   "tema": item.get("tema"), "titulo": item.get("titulo")}
                            if src not in sources:
                                sources.append(src)
                except Exception:
                    pass

    if not tool_results:
        # Fallback: do a basic search
        result = tool_buscar_actas(req.message)
        tool_results.append(f"[buscar_actas]:\n{result}")

    # Step 3: Generate answer with context
    data_context = "\n\n---\n\n".join(tool_results)

    answer_msgs = [{"role": "system", "content": ANSWER_PROMPT}]
    for h in req.history[-6:]:
        answer_msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    answer_msgs.append({"role": "user", "content": f"Dades consultades:\n\n{data_context[:12000]}\n\nPregunta: {req.message}"})

    try:
        r2 = client.chat.completions.create(model=MODEL, messages=answer_msgs, temperature=0.3, max_tokens=4000)
        answer = r2.choices[0].message.content
    except Exception as e:
        answer = f"He trobat dades però error al generar resposta: {str(e)[:200]}\n\nDades:\n{data_context[:2000]}"

    return {"answer": answer or "Sense resposta.", "sources": sources[:5]}
