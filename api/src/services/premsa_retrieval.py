import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from ..db import get_db

logger = logging.getLogger(__name__)


@dataclass
class PremsaRetrievalFilters:
    temes: Optional[list[str]] = None
    partits: Optional[list[str]] = None
    sentiment: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    limit_candidates: int = 25


class PremsaRetrievalService:
    def __init__(self) -> None:
        self.logger = logger

    async def retrieve_candidates(
        self,
        query: str,
        *,
        municipio: Optional[str] = None,
        comarca: Optional[str] = None,
        tenant: Optional[str] = None,
        filters: Optional[PremsaRetrievalFilters] = None,
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(
            self._retrieve_candidates_sync,
            query,
            municipio,
            comarca,
            tenant,
            filters or PremsaRetrievalFilters(),
        )

    def rerank(
        self,
        rows: list[dict[str, Any]],
        *,
        query: str,
        municipio: Optional[str] = None,
        comarca: Optional[str] = None,
        partido: Optional[str] = None,
        tenant: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        query_terms = self._query_terms(query)
        scored: list[dict[str, Any]] = []

        for row in rows:
            relevance = self._text_relevance(query_terms, self._candidate_text(row)) + float(row.get("raw_relevance") or 0.0)
            recency_bonus = self._recency_bonus(row.get("date"))
            context_bonus = self._context_bonus(
                row,
                municipio=municipio,
                comarca=comarca,
                partido=partido,
                tenant=tenant,
            )
            final_score = round(relevance + recency_bonus + context_bonus, 4)
            row["score_breakdown"] = {
                "relevance": round(relevance, 4),
                "recency_bonus": round(recency_bonus, 4),
                "context_bonus": round(context_bonus, 4),
                "final_score": final_score,
                "formula": "relevance + recency_bonus + context_bonus",
            }
            row["source"] = "premsa"
            scored.append(row)

        scored.sort(
            key=lambda item: (
                item["score_breakdown"]["final_score"],
                self._timestamp_value(item.get("date")),
            ),
            reverse=True,
        )
        return scored[:limit]

    def _retrieve_candidates_sync(
        self,
        query: str,
        municipio: Optional[str],
        comarca: Optional[str],
        tenant: Optional[str],
        filters: PremsaRetrievalFilters,
    ) -> list[dict[str, Any]]:
        terms = self._query_terms(query)
        params: list[Any] = []
        where = ["data_publicacio IS NOT NULL"]

        if terms:
            like_clauses = []
            for term in terms[:8]:
                wildcard = f"%{term}%"
                like_clauses.append(
                    "(" \
                    "titol ILIKE %s OR " \
                    "COALESCE(resum, '') ILIKE %s OR " \
                    "EXISTS (SELECT 1 FROM unnest(COALESCE(temes, ARRAY[]::text[])) tema WHERE tema ILIKE %s) OR " \
                    "EXISTS (SELECT 1 FROM unnest(COALESCE(partits, ARRAY[]::text[])) partit WHERE partit ILIKE %s)" \
                    ")"
                )
                params.extend([wildcard, wildcard, wildcard, wildcard])
            where.append("(" + " OR ".join(like_clauses) + ")")

        if filters.temes:
            theme_clauses = []
            for tema in filters.temes:
                theme_clauses.append(
                    "EXISTS (SELECT 1 FROM unnest(COALESCE(temes, ARRAY[]::text[])) tema WHERE tema ILIKE %s)"
                )
                params.append(f"%{tema}%")
            where.append("(" + " OR ".join(theme_clauses) + ")")

        if filters.partits:
            party_clauses = []
            for partit in filters.partits:
                party_clauses.append(
                    "EXISTS (SELECT 1 FROM unnest(COALESCE(partits, ARRAY[]::text[])) partit WHERE partit ILIKE %s)"
                )
                params.append(f"%{partit}%")
            where.append("(" + " OR ".join(party_clauses) + ")")

        if filters.sentiment:
            where.append("sentiment = %s")
            params.append(filters.sentiment)

        if filters.date_from:
            where.append("data_publicacio >= %s")
            params.append(filters.date_from)

        if filters.date_to:
            where.append("data_publicacio <= %s")
            params.append(filters.date_to)

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
                sentiment_score,
                0::float AS raw_relevance
            FROM premsa_articles
            WHERE {' AND '.join(where)}
            ORDER BY data_publicacio DESC
            LIMIT %s
        """
        params.append(filters.limit_candidates)

        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params)
            rows = cur.fetchall()

        normalized = [self._normalize_premsa_row(dict(row)) for row in rows]
        self.logger.info(
            "intel_premsa.candidates candidates=%s municipio=%r comarca=%r tenant=%r filters_temes=%s filters_partits=%s sentiment=%r",
            len(normalized),
            municipio,
            comarca,
            tenant,
            len(filters.temes or []),
            len(filters.partits or []),
            filters.sentiment,
        )
        return normalized

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
            "raw_relevance": float(row.get("raw_relevance") or 0.0),
        }

    def _query_terms(self, query: str) -> list[str]:
        tokens = [token.strip(" ,.;:!?()[]{}\n\t\"") for token in query.lower().split()]
        return [token for token in tokens if len(token) >= 3]

    def _candidate_text(self, row: dict[str, Any]) -> str:
        parts = [
            row.get("title") or "",
            row.get("summary") or "",
            row.get("font") or "",
            row.get("municipio") or "",
            row.get("comarca") or "",
            " ".join(row.get("partits") or []),
            " ".join(row.get("temes") or []),
            row.get("sentiment") or "",
        ]
        return " ".join(parts).lower()

    def _text_relevance(self, query_terms: list[str], candidate_text: str) -> float:
        if not query_terms:
            return 0.0
        matches = sum(1 for term in query_terms if term in candidate_text)
        return matches / max(len(query_terms), 1)

    def _recency_bonus(self, value: Any) -> float:
        parsed = self._parse_date(value)
        if not parsed:
            return 0.0
        age_days = max((datetime.now(timezone.utc) - parsed).days, 0)
        return max(0.0, 1 - min(age_days, 365) / 365)

    def _context_bonus(
        self,
        row: dict[str, Any],
        *,
        municipio: Optional[str],
        comarca: Optional[str],
        partido: Optional[str],
        tenant: Optional[str],
    ) -> float:
        bonus = 0.0
        title_summary = f"{row.get('title') or ''} {row.get('summary') or ''}".lower()
        partits = [str(item).lower() for item in (row.get("partits") or [])]

        if municipio and municipio.lower() in title_summary:
            bonus += 0.35
        if comarca and comarca.lower() in title_summary:
            bonus += 0.2
        if partido and (partido.lower() in partits or partido.lower() in title_summary):
            bonus += 0.2
        if tenant and tenant.lower() in title_summary:
            bonus += 0.1
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


premsa_retrieval_service = PremsaRetrievalService()
