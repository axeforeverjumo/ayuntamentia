import os
from openai import OpenAI
from fastapi import APIRouter
from pydantic import BaseModel
from ..db import get_cursor

router = APIRouter()

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://172.17.0.1:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")


def get_llm():
    return OpenAI(base_url=PROXY_URL, api_key="subscription")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/")
def chat(req: ChatRequest):
    """Chat Q&A usando full-text search + GPT-5.4."""

    context_parts = []
    sources = []

    with get_cursor() as cur:
        # Search in structured puntos first
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
            LIMIT 15
        """, (req.message,))
        puntos = cur.fetchall()

        for p in puntos:
            vots = ""
            if p.get("votaciones"):
                vots = " | Vots: " + ", ".join(
                    f"{v['partido']}:{v['sentido']}" for v in p["votaciones"] if isinstance(v, dict)
                )
            context_parts.append(
                f"[{p['municipio']} — {p['fecha']}] Tema: {p.get('tema', '?')}\n"
                f"{p['titulo']}\n{p.get('resumen', '')}\nResultat: {p.get('resultado', '?')}{vots}"
            )
            sources.append({
                "municipio": p["municipio"], "fecha": str(p["fecha"]),
                "tema": p.get("tema"), "titulo": p["titulo"],
            })

        # Also search in raw acta text (catches more results)
        cur.execute("""
            SELECT a.fecha, m.nombre, LEFT(a.texto, 1000) as snippet
            FROM actas a JOIN municipios m ON a.municipio_id = m.id
            WHERE a.tsv @@ plainto_tsquery('spanish', %s) AND a.texto IS NOT NULL
            ORDER BY ts_rank(a.tsv, plainto_tsquery('spanish', %s)) DESC
            LIMIT 8
        """, (req.message, req.message))
        for r in cur.fetchall():
            context_parts.append(f"[{r['nombre']} — {r['fecha']}]\n{r['snippet']}")
            if not any(s["municipio"] == r["nombre"] for s in sources):
                sources.append({"municipio": r["nombre"], "fecha": str(r["fecha"]), "tema": None, "titulo": None})

    if not context_parts:
        return {
            "answer": "No he trobat informació rellevant a les actes processades. "
                      "El sistema encara està processant actes — prova més tard o reformula la pregunta.",
            "sources": [],
        }

    context = "\n\n---\n\n".join(context_parts)

    messages = [
        {"role": "system", "content": "Eres AyuntamentIA, asistente de inteligencia política de Catalunya. "
         "Responde basándote SOLO en el contexto. Cita municipio y fecha. Usa markdown. "
         "Responde en el idioma de la pregunta."},
    ]
    for h in req.history[-6:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": f"Contexto:\n{context}\n\nPregunta: {req.message}"})

    try:
        client = get_llm()
        resp = client.chat.completions.create(model=MODEL, messages=messages, max_tokens=4000, temperature=0.3)
        answer = resp.choices[0].message.content
    except Exception as e:
        answer = f"Error al generar resposta: {str(e)[:300]}"

    return {"answer": answer, "sources": sources[:5]}
