import os
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/")
def chat(req: ChatRequest):
    """Chat Q&A con RAG sobre actas de plenos."""
    from qdrant_client import QdrantClient
    from openai import OpenAI

    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    collection = os.getenv("QDRANT_COLLECTION", "ayuntamentia_puntos")
    openclaw_url = os.getenv("OPENCLAW_BASE_URL", "http://localhost:4200/v1")

    client = OpenAI(base_url=openclaw_url, api_key="x")

    # 1. Generate embedding for query
    emb = client.embeddings.create(model="text-embedding-3-small", input=req.message[:4000]).data[0].embedding

    # 2. Search relevant puntos
    qdrant = QdrantClient(url=qdrant_url)
    results = qdrant.search(collection_name=collection, query_vector=emb, limit=15)

    # 3. Build context
    context_parts = []
    for hit in results:
        p = hit.payload
        context_parts.append(
            f"[{p.get('municipio', '?')} — {p.get('fecha', '?')}] "
            f"Tema: {p.get('tema', '?')} | {p.get('titulo', '?')}\n"
            f"Resumen: {p.get('resumen', '?')}\n"
            f"Resultado: {p.get('resultado', '?')}"
        )

    context = "\n\n---\n\n".join(context_parts)

    # 4. Also search full-text for exact matches
    from ..db import get_cursor
    with get_cursor() as cur:
        cur.execute("""
            SELECT a.fecha, m.nombre, LEFT(a.texto, 500) as snippet
            FROM actas a JOIN municipios m ON a.municipio_id = m.id
            WHERE a.tsv @@ plainto_tsquery('spanish', %s)
            ORDER BY ts_rank(a.tsv, plainto_tsquery('spanish', %s)) DESC
            LIMIT 5
        """, (req.message, req.message))
        text_results = cur.fetchall()

    if text_results:
        context += "\n\n--- Resultados de búsqueda textual ---\n\n"
        for r in text_results:
            context += f"[{r['nombre']} — {r['fecha']}] {r['snippet']}\n\n"

    # 5. Build messages
    system = """Eres AyuntamentIA, un asistente de inteligencia política especializado en plenos municipales de Catalunya.
Responde basándote SOLO en el contexto proporcionado. Cita siempre municipio y fecha.
Si no tienes datos suficientes, dilo. Responde en el idioma de la pregunta."""

    messages = [{"role": "system", "content": system}]
    for h in req.history[-6:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": f"Contexto:\n{context}\n\nPregunta: {req.message}"})

    # 6. Generate response
    response = client.chat.completions.create(
        model=os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4"),
        messages=messages,
        temperature=0.3,
        max_tokens=4000,
    )

    answer = response.choices[0].message.content

    return {
        "answer": answer,
        "sources": [
            {"municipio": h.payload.get("municipio"), "fecha": h.payload.get("fecha"),
             "tema": h.payload.get("tema"), "titulo": h.payload.get("titulo")}
            for h in results[:5]
        ],
    }
