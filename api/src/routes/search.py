from fastapi import APIRouter, Query
from typing import Optional
from ..db import get_cursor

router = APIRouter()


@router.get("/")
def search(
    q: str = Query(..., min_length=2),
    municipio: Optional[str] = None,
    partido: Optional[str] = None,
    tema: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    modo: str = Query("todo", regex="^(todo|votaciones|argumentos|acuerdos)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    conditions = []
    params = []

    # Full-text search (use OR for multi-word queries for broader matching)
    words = [w for w in q.split() if len(w) >= 3]
    if words:
        or_query = " | ".join(words)  # OR-based tsquery
        conditions.append("a.tsv @@ to_tsquery('spanish', %s)")
        params.append(or_query)
    else:
        conditions.append("a.tsv @@ plainto_tsquery('spanish', %s)")
        params.append(q)

    if municipio:
        conditions.append("m.nombre ILIKE %s")
        params.append(f"%{municipio}%")

    if partido:
        conditions.append("EXISTS (SELECT 1 FROM votaciones v2 JOIN puntos_pleno p2 ON v2.punto_id = p2.id WHERE p2.acta_id = a.id AND v2.partido ILIKE %s)")
        params.append(f"%{partido}%")

    if tema:
        conditions.append("EXISTS (SELECT 1 FROM puntos_pleno p3 WHERE p3.acta_id = a.id AND p3.tema = %s)")
        params.append(tema)

    if fecha_desde:
        conditions.append("a.fecha >= %s")
        params.append(fecha_desde)

    if fecha_hasta:
        conditions.append("a.fecha <= %s")
        params.append(fecha_hasta)

    where = " AND ".join(conditions)

    with get_cursor() as cur:
        # Count
        cur.execute(f"""
            SELECT COUNT(*) as total FROM actas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            WHERE {where}
        """, params)
        total = cur.fetchone()["total"]

        # Results
        cur.execute(f"""
            SELECT a.id, a.fecha, a.tipo, a.nom_ens, m.nombre as municipio,
                   ts_rank(a.tsv, plainto_tsquery('spanish', %s)) as relevance,
                   ts_headline('spanish', LEFT(a.texto, 2000), plainto_tsquery('spanish', %s),
                       'StartSel=<mark>, StopSel=</mark>, MaxWords=60, MinWords=30') as snippet
            FROM actas a
            LEFT JOIN municipios m ON a.municipio_id = m.id
            WHERE {where} AND a.texto IS NOT NULL
            ORDER BY relevance DESC, a.fecha DESC
            LIMIT %s OFFSET %s
        """, [q, q] + params + [limit, offset])
        results = cur.fetchall()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "results": results,
    }


@router.get("/semantic")
def search_semantic(
    q: str = Query(..., min_length=5),
    tema: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
):
    """Búsqueda semántica usando embeddings de Qdrant."""
    import os
    from qdrant_client import QdrantClient

    qdrant = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
    collection = os.getenv("QDRANT_COLLECTION", "ayuntamentia_puntos")

    # Generate embedding for query
    from openai import OpenAI
    client = OpenAI(base_url=os.getenv("OPENCLAW_BASE_URL", "http://localhost:4200/v1"), api_key="x")
    embedding = client.embeddings.create(model="text-embedding-3-small", input=q[:4000]).data[0].embedding

    search_kwargs = {
        "collection_name": collection,
        "query_vector": embedding,
        "limit": limit,
    }

    if tema:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        search_kwargs["query_filter"] = Filter(must=[FieldCondition(key="tema", match=MatchValue(value=tema))])

    results = qdrant.search(**search_kwargs)
    return [{"score": h.score, **h.payload} for h in results]
