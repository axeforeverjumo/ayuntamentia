"""Chat con function calling — el LLM decide qué buscar."""

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

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_actas",
            "description": "Busca en el texto completo de las actas de plenos municipales. Usa palabras clave relevantes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Palabras clave para buscar en las actas (ej: 'pressupost urbanisme Ripoll')"},
                    "limit": {"type": "integer", "description": "Número máximo de resultados", "default": 10},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_votaciones_partido",
            "description": "Busca todas las votaciones de un partido político en los plenos municipales. Devuelve qué votaron, en qué temas y en qué municipios.",
            "parameters": {
                "type": "object",
                "properties": {
                    "partido": {"type": "string", "description": "Nombre o siglas del partido (ej: 'AC', 'ERC', 'PSC', 'CUP', 'JxCat')"},
                    "tema": {"type": "string", "description": "Filtrar por tema (ej: 'urbanismo', 'hacienda', 'seguridad'). Opcional."},
                    "municipio": {"type": "string", "description": "Filtrar por municipio. Opcional."},
                },
                "required": ["partido"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "info_municipio",
            "description": "Obtiene información completa de un municipio: composición del pleno, concejales, últimos plenos, temas frecuentes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {"type": "string", "description": "Nombre del municipio (ej: 'Ripoll', 'Vila-seca', 'Lleida')"},
                },
                "required": ["nombre"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "estadisticas_generales",
            "description": "Obtiene estadísticas generales del sistema: total municipios, actas procesadas, votaciones, temas trending, estado del pipeline.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

SYSTEM_PROMPT = """Eres AyuntamentIA, un asistente experto en política municipal de Catalunya.

Tienes acceso a una base de datos con actas de plenos municipales de los 947 municipios de Catalunya.
El sistema está procesando ~42.000 actas, y ya tiene centenares procesadas con votaciones, temas y argumentos extraídos.

INSTRUCCIONES:
- Usa las herramientas disponibles para buscar información antes de responder.
- Si te preguntan sobre un partido, usa buscar_votaciones_partido.
- Si te preguntan sobre un municipio, usa info_municipio.
- Si te preguntan algo general, usa buscar_actas con keywords relevantes.
- Puedes llamar a varias herramientas si necesitas cruzar información.
- Cita siempre municipio y fecha en tus respuestas.
- Responde en el idioma de la pregunta (catalán o castellano).
- Usa markdown para formatear.
- Si no hay datos suficientes, dilo honestamente y sugiere qué preguntar."""


def get_llm():
    return OpenAI(base_url=PROXY_URL, api_key="subscription")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


# === Tool implementations ===

def _tool_buscar_actas(query: str, limit: int = 10) -> str:
    words = re.findall(r'\w{3,}', query)
    if not words:
        return json.dumps({"results": [], "total": 0})

    tsquery = " | ".join(words[:8])
    with get_cursor() as cur:
        cur.execute("""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object(
                       'partido', v.partido, 'sentido', v.sentido
                   )) FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            JOIN actas a ON p.acta_id = a.id
            WHERE a.tsv @@ to_tsquery('spanish', %s)
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC
            LIMIT %s
        """, (tsquery, limit))
        rows = cur.fetchall()

        # Also try raw text if few results
        if len(rows) < 3:
            like_params = [f"%{w}%" for w in words[:3]]
            like_clause = " OR ".join(["a.texto ILIKE %s"] * len(like_params))
            cur.execute(f"""
                SELECT a.fecha, m.nombre as municipio, LEFT(a.texto, 600) as extracto
                FROM actas a JOIN municipios m ON a.municipio_id = m.id
                WHERE ({like_clause}) AND a.texto IS NOT NULL
                ORDER BY a.fecha DESC LIMIT 5
            """, like_params)
            extra = cur.fetchall()
            for e in extra:
                rows.append({"municipio": e["municipio"], "fecha": e["fecha"],
                             "titulo": "Extracto d'acta", "resumen": e["extracto"][:400],
                             "tema": None, "resultado": None, "votaciones": None})

    return json.dumps({"total": len(rows), "results": [dict(r) for r in rows]}, default=str, ensure_ascii=False)


def _tool_buscar_votaciones_partido(partido: str, tema: str = None, municipio: str = None) -> str:
    # Map common names to SQL
    partido_upper = partido.upper().strip()
    if partido_upper in ("AC", "ALIANÇA", "ALIANÇA CATALANA", "ALIANZA CATALANA", "ALIANÇA.CAT"):
        where = "(v.partido = 'AC' OR v.partido = 'ALIANÇA.CAT' OR v.partido LIKE 'AC-%' OR v.partido = 'ERC-AC')"
    else:
        where = f"v.partido ILIKE '%{partido}%'"

    extra = ""
    params = []
    if tema:
        extra += " AND p.tema = %s"
        params.append(tema)
    if municipio:
        extra += " AND m.nombre ILIKE %s"
        params.append(f"%{municipio}%")

    with get_cursor() as cur:
        cur.execute(f"""
            SELECT v.partido, v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, p.resumen
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} {extra}
            ORDER BY p.fecha DESC LIMIT 30
        """, params)
        rows = cur.fetchall()

        # Summary stats
        cur.execute(f"""
            SELECT v.sentido, COUNT(*) as n
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} {extra}
            GROUP BY v.sentido
        """, params)
        stats = cur.fetchall()

        cur.execute(f"""
            SELECT DISTINCT m.nombre, COUNT(v.id) as votos
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} {extra}
            GROUP BY m.nombre ORDER BY votos DESC
        """, params)
        municipios = cur.fetchall()

    return json.dumps({
        "partido": partido,
        "total_votaciones": sum(s["n"] for s in stats),
        "resumen_votos": {s["sentido"]: s["n"] for s in stats},
        "municipios": [dict(m) for m in municipios],
        "votaciones": [dict(r) for r in rows],
    }, default=str, ensure_ascii=False)


def _tool_info_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM municipios WHERE nombre ILIKE %s LIMIT 1", (f"%{nombre}%",))
        mun = cur.fetchone()
        if not mun:
            return json.dumps({"error": f"Municipio '{nombre}' no encontrado"})

        mid = mun["id"]
        cur.execute("SELECT partido, COUNT(*) as n FROM cargos_electos WHERE municipio_id=%s AND activo GROUP BY partido ORDER BY n DESC", (mid,))
        comp = cur.fetchall()

        cur.execute("SELECT a.fecha, a.tipo, (SELECT COUNT(*) FROM puntos_pleno p WHERE p.acta_id=a.id) as puntos FROM actas a WHERE a.municipio_id=%s AND a.status='structured' ORDER BY a.fecha DESC LIMIT 5", (mid,))
        plenos = cur.fetchall()

        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE municipio_id=%s AND tema IS NOT NULL GROUP BY tema ORDER BY n DESC LIMIT 8", (mid,))
        temas = cur.fetchall()

    return json.dumps({
        "nombre": mun["nombre"], "comarca": mun["comarca"], "provincia": mun["provincia"],
        "poblacion": mun["poblacion"], "tiene_ac": mun["tiene_ac"],
        "composicion": [dict(c) for c in comp],
        "ultimos_plenos": [dict(p) for p in plenos],
        "temas_frecuentes": [dict(t) for t in temas],
    }, default=str, ensure_ascii=False)


def _tool_estadisticas_generales() -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM dashboard_stats")
        stats = cur.fetchone()
        cur.execute("SELECT status, COUNT(*) as n FROM actas GROUP BY status ORDER BY n DESC")
        pipeline = cur.fetchall()
        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE tema IS NOT NULL AND tema != 'procedimiento' GROUP BY tema ORDER BY n DESC LIMIT 10")
        temas = cur.fetchall()
    return json.dumps({
        "stats": dict(stats) if stats else {},
        "pipeline": [dict(p) for p in pipeline],
        "temas_top": [dict(t) for t in temas],
    }, default=str, ensure_ascii=False)


TOOL_MAP = {
    "buscar_actas": lambda args: _tool_buscar_actas(args.get("query", ""), args.get("limit", 10)),
    "buscar_votaciones_partido": lambda args: _tool_buscar_votaciones_partido(args.get("partido", ""), args.get("tema"), args.get("municipio")),
    "info_municipio": lambda args: _tool_info_municipio(args.get("nombre", "")),
    "estadisticas_generales": lambda args: _tool_estadisticas_generales(),
}


@router.post("/")
def chat(req: ChatRequest):
    """Chat con function calling — el LLM decide qué herramientas usar."""
    client = get_llm()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in req.history[-8:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": req.message})

    sources = []

    try:
        # First call — LLM may request tool calls
        resp = client.chat.completions.create(
            model=MODEL, messages=messages, tools=TOOLS, temperature=0.3, max_tokens=4000,
        )

        if not resp.choices:
            raise ValueError("Empty response from LLM")

        msg = resp.choices[0].message

        # If the model wants to call tools
        if msg.tool_calls:
            tool_results = []

            for call in msg.tool_calls:
                fn_name = call.function.name
                try:
                    fn_args = json.loads(call.function.arguments) if call.function.arguments else {}
                except json.JSONDecodeError:
                    fn_args = {}

                tool_fn = TOOL_MAP.get(fn_name)
                result = tool_fn(fn_args) if tool_fn else json.dumps({"error": f"Tool {fn_name} not found"})

                tool_results.append({"name": fn_name, "result": result})

                # Extract sources
                try:
                    parsed = json.loads(result)
                    for item in (parsed.get("results") or parsed.get("votaciones") or [])[:5]:
                        if isinstance(item, dict) and item.get("municipio"):
                            src = {"municipio": item["municipio"], "fecha": str(item.get("fecha", "")),
                                   "tema": item.get("tema"), "titulo": item.get("titulo")}
                            if src not in sources:
                                sources.append(src)
                except Exception:
                    pass

            # Second call — inject tool results as assistant context
            # Use simple message format instead of tool role (proxy compatibility)
            tool_context = "\n\n".join([
                f"[Resultat de {tr['name']}]:\n{tr['result'][:6000]}"
                for tr in tool_results
            ])

            messages.append({"role": "assistant", "content": f"He consultat la base de dades. Resultats:\n\n{tool_context}"})
            messages.append({"role": "user", "content": "Ara, amb aquesta informació, respon la pregunta original de l'usuari de forma clara i ben formatada en markdown."})

            resp2 = client.chat.completions.create(
                model=MODEL, messages=messages, temperature=0.3, max_tokens=4000,
            )
            if resp2.choices:
                answer = resp2.choices[0].message.content
            else:
                answer = f"He trobat dades però no he pogut generar la resposta. Dades:\n\n{tool_context[:2000]}"
        else:
            answer = msg.content

    except Exception as e:
        answer = f"Error: {str(e)[:400]}"

    return {"answer": answer or "No he pogut generar resposta.", "sources": sources[:5]}
