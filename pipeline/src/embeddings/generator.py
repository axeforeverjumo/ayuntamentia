"""Generación de embeddings y gestión de la collection de Qdrant."""

import logging

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from ..config import config
from ..db import get_db, get_cursor
from ..llm.openclaw_client import get_client

logger = logging.getLogger(__name__)

_qdrant = None
EMBEDDING_DIM = 1536


def get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(url=config.QDRANT_URL)
    return _qdrant


def ensure_collection():
    """Crea la collection si no existe."""
    client = get_qdrant()
    collections = [c.name for c in client.get_collections().collections]
    if config.QDRANT_COLLECTION not in collections:
        client.create_collection(
            collection_name=config.QDRANT_COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        logger.info(f"Created Qdrant collection: {config.QDRANT_COLLECTION}")


def generate_embedding(text: str) -> list[float]:
    """Genera embedding usando el modelo de OpenAI via OpenClaw."""
    client = get_client()
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return resp.data[0].embedding


def index_punto(punto_id: int):
    """Genera embedding para un punto del pleno y lo indexa en Qdrant."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute("""
                SELECT p.id, p.acta_id, p.municipio_id, p.fecha, p.titulo, p.tema,
                       p.resultado, p.resumen, m.nombre as municipio_nombre
                FROM puntos_pleno p
                LEFT JOIN municipios m ON p.municipio_id = m.id
                WHERE p.id = %s
            """, (punto_id,))
            punto = cur.fetchone()
            if not punto:
                return False

    text_to_embed = f"""
Municipio: {punto.get('municipio_nombre', '')}
Fecha: {punto.get('fecha', '')}
Tema: {punto.get('tema', '')}
Título: {punto.get('titulo', '')}
Resumen: {punto.get('resumen', '')}
Resultado: {punto.get('resultado', '')}
""".strip()

    try:
        embedding = generate_embedding(text_to_embed)
        qdrant = get_qdrant()
        qdrant.upsert(
            collection_name=config.QDRANT_COLLECTION,
            points=[
                PointStruct(
                    id=punto_id,
                    vector=embedding,
                    payload={
                        "punto_id": punto["id"],
                        "acta_id": punto["acta_id"],
                        "municipio_id": punto["municipio_id"],
                        "municipio": punto.get("municipio_nombre", ""),
                        "fecha": str(punto["fecha"]),
                        "tema": punto.get("tema", ""),
                        "titulo": punto.get("titulo", ""),
                        "resumen": punto.get("resumen", ""),
                        "resultado": punto.get("resultado", ""),
                    }
                )
            ]
        )
        return True
    except Exception as e:
        logger.error(f"Failed to index punto {punto_id}: {e}")
        return False


def search_similar(query: str, limit: int = 10, filters: dict | None = None) -> list[dict]:
    """Búsqueda semántica de puntos del pleno."""
    embedding = generate_embedding(query)
    qdrant = get_qdrant()

    search_params = {
        "collection_name": config.QDRANT_COLLECTION,
        "query_vector": embedding,
        "limit": limit,
    }

    if filters:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        conditions = []
        for key, value in filters.items():
            conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
        search_params["query_filter"] = Filter(must=conditions)

    results = qdrant.search(**search_params)
    return [
        {**hit.payload, "score": hit.score}
        for hit in results
    ]
