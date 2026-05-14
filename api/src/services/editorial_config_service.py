from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from ..db import get_db

DEFAULT_TRENDING_CONFIG: dict[str, Any] = {
    "weights": {
        "delta_plens": 0.6,
        "score_premsa": 0.4,
        "score_xarxes": 0.0,
    },
    "penalties": {
        "Hisenda": 0.30,
        "RRHH": 0.40,
        "Urbanisme rutinari": 0.50,
        "default": 0.80,
    },
}


class EditorialConfigService:
    def clone_default_trending_config(self) -> dict[str, Any]:
        return json.loads(json.dumps(DEFAULT_TRENDING_CONFIG))

    def normalize_trending_config(self, raw_config: Optional[dict[str, Any]]) -> dict[str, Any]:
        if not isinstance(raw_config, dict):
            return self.clone_default_trending_config()

        weights = raw_config.get("weights")
        penalties = raw_config.get("penalties")
        if not isinstance(weights, dict) or not isinstance(penalties, dict):
            return self.clone_default_trending_config()

        required_weight_keys = {"delta_plens", "score_premsa", "score_xarxes"}
        if not required_weight_keys.issubset(weights.keys()) or "default" not in penalties:
            return self.clone_default_trending_config()

        try:
            normalized_weights = {
                "delta_plens": float(weights["delta_plens"]),
                "score_premsa": float(weights["score_premsa"]),
                "score_xarxes": float(weights["score_xarxes"]),
            }
            normalized_penalties = {key: float(value) for key, value in penalties.items()}
        except (TypeError, ValueError):
            return self.clone_default_trending_config()

        return {
            "weights": normalized_weights,
            "penalties": normalized_penalties,
        }

    def get_trending_config_payload(self) -> dict[str, Any]:
        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT trending_config_json, trending_config_updated_at, trending_config_updated_by
                FROM alertas_reglas
                WHERE trending_config_json IS NOT NULL
                ORDER BY trending_config_updated_at DESC NULLS LAST, id ASC
                LIMIT 1
                """
            )
            row = cur.fetchone()

        if not row:
            return {
                "config": self.clone_default_trending_config(),
                "meta": {
                    "source": "fallback_default",
                    "updated_at": None,
                    "updated_by": None,
                },
            }

        raw_config = row.get("trending_config_json")
        parsed_from_string_failed = False
        if isinstance(raw_config, str):
            try:
                raw_config = json.loads(raw_config)
            except json.JSONDecodeError:
                raw_config = None
                parsed_from_string_failed = True

        config = self.normalize_trending_config(raw_config)
        default_config = self.clone_default_trending_config()
        source = "database"
        if parsed_from_string_failed or (raw_config is None and row.get("trending_config_json") is not None):
            source = "fallback_invalid_database_config"
        elif config == default_config and raw_config != default_config:
            source = "fallback_invalid_database_config"

        return {
            "config": config,
            "meta": {
                "source": source,
                "updated_at": self._iso_datetime(row.get("trending_config_updated_at")),
                "updated_by": row.get("trending_config_updated_by"),
            },
        }

    def _iso_datetime(self, value: Any) -> Optional[str]:
        if isinstance(value, datetime):
            normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return normalized.isoformat()
        return None


editorial_config_service = EditorialConfigService()
