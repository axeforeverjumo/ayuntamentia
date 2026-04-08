import os
import re
from openai import OpenAI
from fastapi import APIRouter
from pydantic import BaseModel
from ..db import get_cursor

router = APIRouter()

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

# Map common Spanish terms to their Catalan equivalents for search
PARTY_ALIASES = {
    "alianza catalana": ["ALIANÇA", "AC", "ALIANÇA.CAT"],
    "aliança catalana": ["ALIANÇA", "AC", "ALIANÇA.CAT"],
    "erc": ["ERC", "Esquerra"],
    "junts": ["JxCat", "Junts"],
    "psc": ["PSC", "Socialista"],
    "cup": ["CUP"],
    "pp": ["PP", "Popular"],
    "vox": ["VOX"],
}


def get_llm():
    return OpenAI(base_url=PROXY_URL, api_key="subscription")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


def _search_context(message: str) -> tuple[list[str], list[dict]]:
    """Multi-strategy search: full-text + ILIKE + party matching."""
    context_parts = []
    sources = []
    msg_lower = message.lower()

    with get_cursor() as cur:
        # Strategy 1: Search by party name in votaciones
        party_matches = []
        for alias_key, aliases in PARTY_ALIASES.items():
            if alias_key in msg_lower:
                party_matches.extend(aliases)

        if party_matches:
            like_conditions = " OR ".join(["v.partido ILIKE %s"] * len(party_matches))
            params = [f"%{a}%" for a in party_matches]
            cur.execute(f"""
                SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                       m.nombre as municipio, v.partido, v.sentido
                FROM puntos_pleno p
                JOIN municipios m ON p.municipio_id = m.id
                JOIN votaciones v ON v.punto_id = p.id
                WHERE ({like_conditions})
                ORDER BY p.fecha DESC
                LIMIT 20
            """, params)
            for p in cur.fetchall():
                context_parts.append(
                    f"[{p['municipio']} — {p['fecha']}] Tema: {p.get('tema', '?')}\n"
                    f"{p['titulo']}\n{p.get('resumen', '')}\n"
                    f"Vot {p['partido']}: {p['sentido']} | Resultat: {p.get('resultado', '?')}"
                )
                if not any(s.get("titulo") == p["titulo"] and s.get("fecha") == str(p["fecha"]) for s in sources):
                    sources.append({
                        "municipio": p["municipio"], "fecha": str(p["fecha"]),
                        "tema": p.get("tema"), "titulo": p["titulo"],
                    })

        # Strategy 2: Full-text search on structured puntos
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
            WHERE a.tsv @@ plainto_tsquery('spanish', %s)
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC
            LIMIT 10
        """, (message,))
        for p in cur.fetchall():
            vots = ""
            if p.get("votaciones"):
                vots = " | Vots: " + ", ".join(
                    f"{v['partido']}:{v['sentido']}" for v in p["votaciones"] if isinstance(v, dict)
                )
            entry = (
                f"[{p['municipio']} — {p['fecha']}] Tema: {p.get('tema', '?')}\n"
                f"{p['titulo']}\n{p.get('resumen', '')}\nResultat: {p.get('resultado', '?')}{vots}"
            )
            if entry not in context_parts:
                context_parts.append(entry)
                sources.append({
                    "municipio": p["municipio"], "fecha": str(p["fecha"]),
                    "tema": p.get("tema"), "titulo": p["titulo"],
                })

        # Strategy 3: ILIKE search on raw text for key terms
        keywords = re.findall(r'\b\w{4,}\b', message)
        if keywords and len(context_parts) < 5:
            like_clause = " AND ".join(["a.texto ILIKE %s"] * min(3, len(keywords)))
            like_params = [f"%{kw}%" for kw in keywords[:3]]
            cur.execute(f"""
                SELECT a.fecha, m.nombre, LEFT(a.texto, 1000) as snippet
                FROM actas a JOIN municipios m ON a.municipio_id = m.id
                WHERE ({like_clause}) AND a.texto IS NOT NULL
                ORDER BY a.fecha DESC
                LIMIT 5
            """, like_params)
            for r in cur.fetchall():
                context_parts.append(f"[{r['nombre']} — {r['fecha']}]\n{r['snippet']}")
                if not any(s["municipio"] == r["nombre"] for s in sources):
                    sources.append({"municipio": r["nombre"], "fecha": str(r["fecha"]), "tema": None, "titulo": None})

        # Strategy 4: If still empty, get latest AC activity as fallback
        if not context_parts and any(k in msg_lower for k in ["alianza", "aliança", "partido", "partit", "ac "]):
            cur.execute("""
                SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                       m.nombre as municipio, v.partido, v.sentido
                FROM puntos_pleno p
                JOIN municipios m ON p.municipio_id = m.id
                JOIN votaciones v ON v.punto_id = p.id
                JOIN municipios mac ON mac.tiene_ac = TRUE AND m.id = mac.id
                ORDER BY p.fecha DESC
                LIMIT 20
            """)
            for p in cur.fetchall():
                context_parts.append(
                    f"[{p['municipio']} — {p['fecha']}] {p['titulo']}\n"
                    f"{p.get('resumen', '')} | {p['partido']}: {p['sentido']}"
                )
                if not any(s.get("titulo") == p["titulo"] for s in sources):
                    sources.append({
                        "municipio": p["municipio"], "fecha": str(p["fecha"]),
                        "tema": p.get("tema"), "titulo": p["titulo"],
                    })

    return context_parts, sources


@router.post("/")
def chat(req: ChatRequest):
    """Chat Q&A usando multi-strategy search + GPT-5.4."""

    context_parts, sources = _search_context(req.message)

    if not context_parts:
        return {
            "answer": "No he trobat informació rellevant a les actes processades. "
                      "El sistema encara està processant actes — prova més tard o reformula la pregunta.",
            "sources": [],
        }

    context = "\n\n---\n\n".join(context_parts[:20])

    messages = [
        {"role": "system", "content":
         "Eres AyuntamentIA, asistente de inteligencia política de Catalunya. "
         "Responde basándote SOLO en el contexto proporcionado. Cita siempre municipio y fecha. "
         "Usa markdown para formatear. Responde en el idioma de la pregunta."},
    ]
    for h in req.history[-6:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": f"Contexto de actas municipales:\n\n{context}\n\nPregunta: {req.message}"})

    try:
        client = get_llm()
        resp = client.chat.completions.create(model=MODEL, messages=messages, max_tokens=4000, temperature=0.3)
        answer = resp.choices[0].message.content
    except Exception as e:
        answer = f"Error al generar resposta: {str(e)[:300]}"

    return {"answer": answer, "sources": sources[:5]}
