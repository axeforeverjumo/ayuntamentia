import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")

import importlib  # noqa: E402

editorial_module = importlib.import_module("api.src.services.editorial_config_service")  # noqa: E402
from api.src.services.trending_score_service import (  # noqa: E402
    DEFAULT_NEGATIVE_TREATMENT,
    DEFAULT_TRENDING_CONFIG,
    TrendingScoreService,
)


def test_calculate_scores_with_28_day_plens_and_7_day_premsa():
    service = TrendingScoreService()

    results = service.calculate_scores(
        plens_recent={"seguretat": 8, "habitatge": 4},
        plens_previous={"seguretat": 2, "habitatge": 3},
        premsa_recent={"seguretat": 5, "habitatge": 1},
        score_xarxes={"seguretat": 0, "habitatge": 0},
        config={
            "weights": {"delta_plens": 0.6, "score_premsa": 0.4, "score_xarxes": 0.0},
            "penalties": {"default": 1.0},
        },
    )

    assert [item["tema"] for item in results] == ["seguretat", "habitatge"]
    assert results[0]["delta_plens"] == 6.0
    assert results[0]["score_premsa"] == 5.0
    assert results[0]["base_score"] == 5.6
    assert results[0]["widget_trending_score"] == results[0]["base_score"]
    assert results[1]["delta_plens"] == 1.0
    assert results[1]["base_score"] == 1.0


def test_penalty_only_affects_widget_score_for_hisenda():
    service = TrendingScoreService()

    results = service.calculate_scores(
        plens_recent={"Hisenda": 10, "habitatge": 8},
        plens_previous={"Hisenda": 5, "habitatge": 5},
        premsa_recent={"Hisenda": 5, "habitatge": 4},
        score_xarxes=None,
        config={
            "weights": {"delta_plens": 0.6, "score_premsa": 0.4, "score_xarxes": 0.0},
            "penalties": {"Hisenda": 0.3, "default": 1.0},
        },
    )

    hisenda = next(item for item in results if item["tema"] == "Hisenda")
    habitatge = next(item for item in results if item["tema"] == "habitatge")

    assert hisenda["base_score"] == 5.0
    assert hisenda["widget_trending_score"] == 1.5
    assert hisenda["widget_penalty_multiplier"] == 0.3
    assert habitatge["base_score"] == habitatge["widget_trending_score"]
    assert habitatge["widget_penalty_multiplier"] == 1.0


def test_missing_social_scores_default_to_zero_without_error():
    service = TrendingScoreService()

    results = service.calculate_scores(
        plens_recent={"mobilitat": 3},
        plens_previous={"mobilitat": 5},
        premsa_recent={"mobilitat": 1},
        score_xarxes=None,
        config={
            "weights": {"delta_plens": 0.6, "score_premsa": 0.4, "score_xarxes": 0.2},
            "penalties": {"default": 1.0},
        },
    )

    assert len(results) == 1
    assert results[0]["score_xarxes"] == 0.0
    assert results[0]["base_score"] == 0.0
    assert results[0]["metadata"]["negative_treatment"] == DEFAULT_NEGATIVE_TREATMENT


def test_invalid_or_unreadable_config_falls_back_safely():
    service = TrendingScoreService()

    assert service.resolve_config(None) == DEFAULT_TRENDING_CONFIG
    assert service.resolve_config({"weights": "bad", "penalties": {}}) == DEFAULT_TRENDING_CONFIG
    assert service.resolve_config({"weights": {"delta_plens": "x"}, "penalties": {"default": "y"}}) == DEFAULT_TRENDING_CONFIG


def test_get_auditable_config_uses_fallback_when_database_payload_is_invalid(monkeypatch):
    service = TrendingScoreService()

    class FakeCursor:
        def __init__(self):
            self._row = {
                "trending_config_json": "{invalid-json}",
                "trending_config_updated_at": None,
                "trending_config_updated_by": "admin",
            }

        def execute(self, sql):
            self.sql = sql

        def fetchone(self):
            return self._row

    class FakeConn:
        def cursor(self, cursor_factory=None):
            return FakeCursor()

        def commit(self):
            return None

        def rollback(self):
            return None

        def close(self):
            return None

    class FakeContextManager:
        def __enter__(self):
            return FakeConn()

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(editorial_module, "get_db", lambda: FakeContextManager())

    payload = service.get_auditable_config()

    assert payload["config"] == DEFAULT_TRENDING_CONFIG
    assert payload["meta"]["source"] == "fallback_invalid_database_config"
    assert payload["meta"]["updated_by"] == "admin"
