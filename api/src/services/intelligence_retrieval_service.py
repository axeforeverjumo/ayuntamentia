import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from ..db import get_db

logger = logging.getLogger(__name__)


@dataclass
class RetrievalContext:
    tenant: Optional[str] = None
    municipio: Optional[str] = None
    comarca: Optional[str] = None
    partido: Optional[str] = None
    limit_per_source: int = 5


class IntelligenceRetrievalService:
    """Dual retrieval para Sala d'Intel·ligència.

    Recupera en paral·lel contextos de plens i premsa, aplica un reranking
    explicable basat en rellevància textual + recència + coincidència de context,
    i degrada amb gràcia si la font de premsa falla.
    """

    def __init__(self) -> None:
        self.logger = logger

    async def retrieve(self, query: str, context: Optional[RetrievalContext] = None) -> dict[str, Any]:
        context = context or RetrievalContext()
        started = time.perf_counter()

        plens_task = self._timed_call("plens", self._fetch_plens_candidates, query, context)
        premsa_task = self._timed_call("premsa", self._fetch_premsa_candidates, query, context)

        plens_result, premsa_result = await asyncio.gather(
            plens_task,
            premsa_task,
            return_exceptions=True,
        )

        plens_payload, premsa_payload, degraded, degradation_reasons = self._resolve_source_results(
            query=query,
            context=context,
            plens_result=plens_result,
            premsa_result=premsa_result,
        )

        total_latency_ms = round((time.perf_counter() - started) * 1000, 2)
        response = {
            "query": query,
            "context": {
                "tenant": context.tenant,
                "municipio": context.municipio,
                "comarca": context.comarca,
                "partido": context.partido,
            },
            "plens_context": plens_payload["items"],
            "premsa_context": premsa_payload["items"],
            "degraded": degraded,
            "degradation_reasons": degradation_reasons,
            "meta": {
                "latency_ms": total_latency_ms,
                "sources": {
                    "plens": {
                        "latency_ms": plens_payload["latency_ms"],
                        "candidates": plens_payload["candidate_count"],
                        "final": plens_payload["final_count"],
                    },
                    "premsa": {
                        "latency_ms": premsa_payload["latency_ms"],
                        "candidates": premsa_payload["candidate_count"],
                        "final": premsa_payload["final_count"],
                    },
                },
                "reranking_formula": "score = relevance + recency_bonus + context_bonus",
            },
        }

        self.logger.info(
            "intel_retrieval.completed query=%r degraded=%s total_latency_ms=%s plens_candidates=%s plens_final=%s premsa_candidates=%s premsa_final=%s",
            query,
            degraded,
            total_latency_ms,
            plens_payload["candidate_count"],
            plens_payload["final_count"],
            premsa_payload["candidate_count"],
            premsa_payload["final_count"],
        )
        return response

    def _resolve_source_results(
        self,
        *,
        query: str,
        context: RetrievalContext,
        plens_result: Any,
        premsa_result: Any,
    ) -> tuple[dict[str, Any], dict[str, Any], bool, list[str]]:
        degraded = False
        degradation_reasons: list[str] = []

        if isinstance(plens_result, Exception) and isinstance(premsa_result, Exception):
            self.logger.error(
                "intel_retrieval.all_sources_failed query=%r municipio=%r comarca=%r partido=%r plens_error=%s premsa_error=%s",
                query,
                context.municipio,
                context.comarca,
                context.partido,
                repr(plens_result),
                repr(premsa_result),
            )
            raise plens_result

        if isinstance(plens_result, Exception):
            self.logger.error(
                "intel_retrieval.plens_failed query=%r municipio=%r comarca=%r partido=%r error=%s",
                query,
                context.municipio,
                context.comarca,
                context.partido,
                repr(plens_result),
            )
            raise plens_result

        plens_payload = plens_result

        if isinstance(premsa_result, Exception):
            degraded = True
            degradation_reasons.append("premsa_unavailable")
            self.logger.warning(
                "intel_retrieval.premsa_failed query=%r municipio=%r comarca=%r partido=%r error=%s",
                query,
                context.municipio,
                context.comarca,
                context.partido,
                repr(premsa_result),
            )
            premsa_payload = self._empty_source_payload()
        else:
            premsa_payload = premsa_result

        return plens_payload, premsa_payload, degraded, degradation_reasons

    def _empty_source_payload(self) -> dict[str, Any]:
        return {"items": [], "latency_ms": None, "candidate_count": 0, "final_count": 0}

    async def _timed_call(self, source: str, func, query: str, context: RetrievalContext) -> dict[str, Any]:
        started = time.perf_counter()
        rows = await func(query, context)
        ranked = self._rerank(rows, query=query, context=context, source=source)
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        final_items = ranked[: context.limit_per_source]

        self.logger.info(
            "intel_retrieval.source source=%s latency_ms=%s candidates=%s final=%s",
            source,
            latency_ms,
            len(rows),
            len(final_items),
        )

        return {
            "items": final_items,
            "latency_ms": latency_ms,
            "candidate_count": len(rows),
            "final_count": len(final_items),
        }

    async def _fetch_plens_candidates(self, query: str, context: RetrievalContext) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._fetch_plens_candidates_sync, query, context)

    async def _fetch_premsa_candidates(self, query: str, context: RetrievalContext) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._fetch_premsa_candidates_sync, query, context)

    def _fetch_plens_candidates_sync(self, query: str, context: RetrievalContext) -> list[dict[str, Any]]:
        terms = self._query_terms(query)
        ts_query = " | ".join(terms) if terms else None
        params: list[Any] = []
        where = ["1=1"]

        if context.municipio:
            where.append("m.nombre ILIKE %s")
            params.append(f"%{context.municipio}%")
        if context.comarca:
            where.append("m.comarca ILIKE %s")
            params.append(f"%{context.comarca}%")
        if context.partido:
            where.append("(EXISTS (SELECT 1 FROM votaciones v WHERE v.punto_id = p.id AND v.partido ILIKE %s) OR EXISTS (SELECT 1 FROM argumentos arg WHERE arg.punto_id = p.id AND arg.partido ILIKE %s))")
            params.extend([f"%{context.partido}%", f"%{context.partido}%"])

        rank_select = "0::float AS relevance"
        if ts_query:
            rank_select = "ts_rank_cd(a.tsv, to_tsquery('spanish', %s))::float AS relevance"
            params.insert(0, ts_query)
            where.append("a.tsv @@ to_tsquery('spanish', %s)")
            params.append(ts_query)

        sql = f"""
            SELECT
                p.id,
                p.titulo,
                p.resumen,
                p.tema,
                p.resultado,
                p.fecha,
                m.nombre AS municipio,
                m.comarca,
                a.id AS acta_id,
                a.url_pdf,
                {rank_select}
            FROM puntos_pleno p
            JOIN actas a ON a.id = p.acta_id
            LEFT JOIN municipios m ON m.id = p.municipio_id
            WHERE {' AND '.join(where)}
            ORDER BY relevance DESC, p.fecha DESC
            LIMIT 25
        """

        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params)
            rows = cur.fetchall()

        return [self._normalize_plens_row(dict(row)) for row in rows]

    def _fetch_premsa_candidates_sync(self, query: str, context: RetrievalContext) -> list[dict[str, Any]]:
        params: list[Any] = []
        where = ["data_publicacio IS NOT NULL"]
        terms = self._query_terms(query)

        if terms:
            like_clauses = []
            for term in terms[:8]:
                like_clauses.append("(titol ILIKE %s OR COALESCE(resum, '') ILIKE %s OR EXISTS (SELECT 1 FROM unnest(COALESCE(temes, ARRAY[]::text[])) tema WHERE tema ILIKE %s) OR EXISTS (SELECT 1 FROM unnest(COALESCE(partits, ARRAY[]::text[])) partit WHERE partit ILIKE %s))")
                wildcard = f"%{term}%"
                params.extend([wildcard, wildcard, wildcard, wildcard])
            where.append("(" + " OR ".join(like_clauses) + ")")

        sql = f"""
            SELECT
                id,
                font,
                titol,
                resum,
                url,
                data_publicacio,
                partits,
                temes,
                sentiment,
                sentiment_score
            FROM premsa_articles
            WHERE {' AND '.join(where)}
            ORDER BY data_publicacio DESC
            LIMIT 25
        """

        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params)
            rows = cur.fetchall()

        return [self._normalize_premsa_row(dict(row)) for row in rows]

    def _rerank(self, rows: list[dict[str, Any]], query: str, context: RetrievalContext, source: str) -> list[dict[str, Any]]:
        scored: list[dict[str, Any]] = []
        query_terms = self._query_terms(query)

        for row in rows:
            text = self._candidate_text(row)
            relevance = self._text_relevance(query_terms, text)
            recency_bonus = self._recency_bonus(row.get("date"))
            context_bonus = self._context_bonus(row, context)
            final_score = round(relevance + recency_bonus + context_bonus, 4)
            row["score_breakdown"] = {
                "relevance": round(relevance, 4),
                "recency_bonus": round(recency_bonus, 4),
                "context_bonus": round(context_bonus, 4),
                "final_score": final_score,
                "formula": "relevance + recency_bonus + context_bonus",
            }
            row["source"] = source
            scored.append(row)

        scored.sort(
            key=lambda item: (
                item["score_breakdown"]["final_score"],
                self._timestamp_value(item.get("date")),
            ),
            reverse=True,
        )
        return scored

    def _normalize_plens_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "title": row.get("titulo"),
            "summary": row.get("resumen"),
            "topic": row.get("tema"),
            "result": row.get("resultado"),
            "municipio": row.get("municipio"),
            "comarca": row.get("comarca"),
            "date": self._iso_date(row.get("fecha")),
            "acta_id": row.get("acta_id"),
            "url": row.get("url_pdf"),
            "raw_relevance": float(row.get("relevance") or 0.0),
        }

    def _normalize_premsa_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "title": row.get("titol"),
            "summary": row.get("resum"),
            "font": row.get("font"),
            "url": row.get("url"),
            "date": self._iso_date(row.get("data_publicacio")),
            "partits": list(row.get("partits") or []),
            "temes": list(row.get("temes") or []),
            "sentiment": row.get("sentiment"),
            "sentiment_score": row.get("sentiment_score"),
        }

    def _query_terms(self, query: str) -> list[str]:
        tokens = [token.strip(" ,.;:!?()[]{}\n\t\"") for token in query.lower().split()]
        return [token for token in tokens if len(token) >= 3]

    def _candidate_text(self, row: dict[str, Any]) -> str:
        parts = [
            row.get("title") or "",
            row.get("summary") or "",
            row.get("topic") or "",
            row.get("municipio") or "",
            row.get("comarca") or "",
            " ".join(row.get("partits") or []),
            " ".join(row.get("temes") or []),
        ]
        return " ".join(parts).lower()

    def _text_relevance(self, query_terms: list[str], candidate_text: str) -> float:
        if not query_terms:
            return 0.0
        matches = 0
        for term in query_terms:
            if term in candidate_text:
                matches += 1
        return matches / max(len(query_terms), 1)

    def _recency_bonus(self, value: Any) -> float:
        parsed = self._parse_date(value)
        if not parsed:
            return 0.0
        age_days = max((datetime.now(timezone.utc) - parsed).days, 0)
        return max(0.0, 1 - min(age_days, 365) / 365)

    def _context_bonus(self, row: dict[str, Any], context: RetrievalContext) -> float:
        bonus = 0.0
        municipio = (row.get("municipio") or "").lower()
        comarca = (row.get("comarca") or "").lower()
        partits = [str(item).lower() for item in (row.get("partits") or [])]
        temes = [str(item).lower() for item in (row.get("temes") or [])]
        title_summary = f"{row.get('title') or ''} {row.get('summary') or ''}".lower()

        if context.municipio and context.municipio.lower() in f"{municipio} {title_summary}":
            bonus += 0.35
        if context.comarca and context.comarca.lower() in f"{comarca} {title_summary}":
            bonus += 0.2
        if context.partido and (
            context.partido.lower() in partits or context.partido.lower() in title_summary
        ):
            bonus += 0.2
        if context.tenant and context.tenant.lower() in title_summary:
            bonus += 0.1
        if context.partido and context.partido.lower() in temes:
            bonus += 0.05
        return bonus

    def _timestamp_value(self, value: Any) -> float:
        parsed = self._parse_date(value)
        return parsed.timestamp() if parsed else 0.0

    def _parse_date(self, value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, date):
            return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                normalized = value.replace("Z", "+00:00")
                parsed = datetime.fromisoformat(normalized)
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    def _iso_date(self, value: Any) -> Optional[str]:
        parsed = self._parse_date(value)
        return parsed.isoformat() if parsed else None


intelligence_retrieval_service = IntelligenceRetrievalService()
