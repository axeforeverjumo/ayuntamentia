from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from ..db import get_db
from .editorial_config_service import (
    DEFAULT_TRENDING_CONFIG,
    editorial_config_service,
)

logger = logging.getLogger(__name__)

DEFAULT_NEGATIVE_TREATMENT = "scores are clamped to 0 after delta/weight combination"


@dataclass(frozen=True)
class TrendingScoreBreakdown:
    tema: str
    delta_plens: float
    score_premsa: float
    score_xarxes: float
    base_score: float
    widget_penalty_multiplier: float
    widget_trending_score: float
    sources_used: list[str]
    metadata: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "tema": self.tema,
            "delta_plens": self.delta_plens,
            "score_premsa": self.score_premsa,
            "score_xarxes": self.score_xarxes,
            "base_score": self.base_score,
            "widget_penalty_multiplier": self.widget_penalty_multiplier,
            "widget_trending_score": self.widget_trending_score,
            "sources_used": self.sources_used,
            "metadata": self.metadata,
        }


class TrendingScoreService:
    def __init__(self) -> None:
        self.logger = logger

    def calculate_scores(
        self,
        *,
        plens_recent: dict[str, float],
        plens_previous: dict[str, float],
        premsa_recent: dict[str, float],
        score_xarxes: Optional[dict[str, float]] = None,
        config: Optional[dict[str, Any]] = None,
    ) -> list[dict[str, Any]]:
        resolved_config = editorial_config_service.normalize_trending_config(config)
        weights = resolved_config["weights"]
        penalties = resolved_config["penalties"]
        social_scores = score_xarxes or {}

        temas = sorted(set(plens_recent) | set(plens_previous) | set(premsa_recent) | set(social_scores))
        results: list[TrendingScoreBreakdown] = []

        for tema in temas:
            delta_plens = self.compute_delta_plens(
                recent_count=plens_recent.get(tema, 0),
                previous_count=plens_previous.get(tema, 0),
            )
            press_score = self.clamp_non_negative(premsa_recent.get(tema, 0))
            social_score = self.clamp_non_negative(social_scores.get(tema, 0))

            base_score = self.clamp_non_negative(
                weights["delta_plens"] * delta_plens
                + weights["score_premsa"] * press_score
                + weights["score_xarxes"] * social_score
            )
            penalty_multiplier = self.penalty_for_topic(tema, penalties)
            widget_score = self.clamp_non_negative(base_score * penalty_multiplier)

            sources_used = ["plens", "premsa"]
            if social_scores:
                sources_used.append("xarxes")

            results.append(
                TrendingScoreBreakdown(
                    tema=tema,
                    delta_plens=delta_plens,
                    score_premsa=press_score,
                    score_xarxes=social_score,
                    base_score=base_score,
                    widget_penalty_multiplier=penalty_multiplier,
                    widget_trending_score=widget_score,
                    sources_used=sources_used,
                    metadata={
                        "weights": weights,
                        "penalties": {
                            "matched_topic": tema if tema in penalties else None,
                            "default_multiplier": penalties["default"],
                            "applied_multiplier": penalty_multiplier,
                        },
                        "negative_treatment": DEFAULT_NEGATIVE_TREATMENT,
                        "components": {
                            "plens_recent": self.clamp_non_negative(plens_recent.get(tema, 0)),
                            "plens_previous": self.clamp_non_negative(plens_previous.get(tema, 0)),
                            "premsa_recent": press_score,
                            "xarxes_recent": social_score,
                        },
                    },
                )
            )

        results.sort(
            key=lambda item: (
                item.widget_trending_score,
                item.base_score,
                item.score_premsa,
                item.delta_plens,
            ),
            reverse=True,
        )
        return [item.as_dict() for item in results]

    def resolve_config(self, raw_config: Optional[dict[str, Any]]) -> dict[str, Any]:
        return editorial_config_service.normalize_trending_config(raw_config)

    def compute_delta_plens(self, *, recent_count: float, previous_count: float) -> float:
        recent = self.clamp_non_negative(recent_count)
        previous = self.clamp_non_negative(previous_count)
        return recent - previous

    def penalty_for_topic(self, tema: str, penalties: dict[str, float]) -> float:
        penalty = penalties.get(tema, penalties.get("default", 1.0))
        return self.clamp_non_negative(penalty)

    def clamp_non_negative(self, value: Any) -> float:
        try:
            return max(float(value or 0), 0.0)
        except (TypeError, ValueError):
            return 0.0

    def get_auditable_config(self) -> dict[str, Any]:
        return editorial_config_service.get_trending_config_payload()

    def fetch_recent_windows(self, *, today: Optional[date] = None) -> dict[str, dict[str, float]]:
        reference_date = today or datetime.now(timezone.utc).date()
        recent_start = reference_date - timedelta(days=13)
        previous_start = recent_start - timedelta(days=14)
        previous_end = recent_start - timedelta(days=1)
        premsa_start = reference_date - timedelta(days=6)

        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT tema, COALESCE(sum(last_14d_mentions), 0)::float AS count
                FROM temas_trend_signals
                WHERE tema IS NOT NULL
                  AND TRIM(tema) <> ''
                GROUP BY tema
                """
            )
            signal_recent = {row["tema"]: float(row["count"] or 0) for row in cur.fetchall()}

            cur.execute(
                """
                SELECT tema, COALESCE(sum(previous_14d_mentions), 0)::float AS count
                FROM temas_trend_signals
                WHERE tema IS NOT NULL
                  AND TRIM(tema) <> ''
                GROUP BY tema
                """
            )
            signal_previous = {row["tema"]: float(row["count"] or 0) for row in cur.fetchall()}

            if signal_recent or signal_previous:
                plens_recent = signal_recent
                plens_previous = signal_previous
                plens_source = "temas_trend_signals"
            else:
                cur.execute(
                    """
                    SELECT LOWER(TRIM(tema)) AS tema, COUNT(*)::float AS count
                    FROM puntos_pleno
                    WHERE tema IS NOT NULL
                      AND TRIM(tema) <> ''
                      AND fecha BETWEEN %s AND %s
                    GROUP BY LOWER(TRIM(tema))
                    """,
                    (recent_start, reference_date),
                )
                plens_recent = {row["tema"]: float(row["count"] or 0) for row in cur.fetchall()}

                cur.execute(
                    """
                    SELECT LOWER(TRIM(tema)) AS tema, COUNT(*)::float AS count
                    FROM puntos_pleno
                    WHERE tema IS NOT NULL
                      AND TRIM(tema) <> ''
                      AND fecha BETWEEN %s AND %s
                    GROUP BY LOWER(TRIM(tema))
                    """,
                    (previous_start, previous_end),
                )
                plens_previous = {row["tema"]: float(row["count"] or 0) for row in cur.fetchall()}
                plens_source = "puntos_pleno"

            cur.execute(
                """
                SELECT tema, COALESCE(nivel_mediatico_redes, 0)::float AS score_xarxes
                FROM temas_trend_signals
                WHERE tema IS NOT NULL
                  AND TRIM(tema) <> ''
                """
            )
            social_scores = {row["tema"]: float(row["score_xarxes"] or 0) for row in cur.fetchall()}

            cur.execute(
                """
                SELECT LOWER(TRIM(topic)) AS tema, COUNT(*)::float AS count
                FROM (
                    SELECT UNNEST(COALESCE(temes, ARRAY[]::text[])) AS topic
                    FROM premsa_articles
                    WHERE data_publicacio IS NOT NULL
                      AND data_publicacio >= %s
                ) expanded
                WHERE topic IS NOT NULL
                  AND TRIM(topic) <> ''
                GROUP BY LOWER(TRIM(topic))
                """,
                (premsa_start,),
            )
            premsa_recent = {row["tema"]: float(row["count"] or 0) for row in cur.fetchall()}

        return {
            "plens_recent": plens_recent,
            "plens_previous": plens_previous,
            "premsa_recent": premsa_recent,
            "score_xarxes": social_scores,
            "windows": {
                "plens_recent": {
                    "from": recent_start.isoformat(),
                    "to": reference_date.isoformat(),
                },
                "plens_previous": {
                    "from": previous_start.isoformat(),
                    "to": previous_end.isoformat(),
                },
                "premsa_recent": {
                    "from": premsa_start.isoformat(),
                    "to": reference_date.isoformat(),
                },
                "plens_source": plens_source,
            },
        }

    def calculate_from_existing_data(self, *, today: Optional[date] = None) -> dict[str, Any]:
        config_payload = self.get_auditable_config()
        windows_payload = self.fetch_recent_windows(today=today)
        scores = self.calculate_scores(
            plens_recent=windows_payload["plens_recent"],
            plens_previous=windows_payload["plens_previous"],
            premsa_recent=windows_payload["premsa_recent"],
            score_xarxes=windows_payload["score_xarxes"],
            config=config_payload["config"],
        )
        return {
            "items": scores,
            "config_meta": config_payload["meta"],
            "windows": windows_payload["windows"],
        }


trending_score_service = TrendingScoreService()
