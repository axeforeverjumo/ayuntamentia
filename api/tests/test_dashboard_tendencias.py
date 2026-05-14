import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")

from api.src.main import app  # noqa: E402
from api.src.routes import dashboard as dashboard_route  # noqa: E402


client = TestClient(app)


def test_tendencias_orders_by_trending_score_and_filters_non_positive(monkeypatch):
    monkeypatch.setattr(
        dashboard_route.dashboard_service,
        "list_tendencias",
        lambda: [
            {
                "tema": "habitatge",
                "count": 3,
                "trending_score": 12.0,
                "score": {
                    "trending_score": 12.0,
                    "delta_plens": 4.0,
                    "score_premsa": 3.0,
                    "score_xarxes": 1.0,
                    "penalty_applied": 0.8,
                    "calculated_at": "2026-05-14T10:00:00+00:00",
                },
            },
            {
                "tema": "pressupost",
                "count": 1,
                "trending_score": 4.0,
                "score": {
                    "trending_score": 4.0,
                    "delta_plens": 1.0,
                    "score_premsa": 1.0,
                    "score_xarxes": 0.0,
                    "penalty_applied": 1.0,
                    "calculated_at": "2026-05-14T10:00:00+00:00",
                },
            },
        ],
    )

    response = client.get("/api/dashboard/temas")

    assert response.status_code == 200
    body = response.json()
    assert [item["tema"] for item in body] == ["habitatge", "pressupost"]
    assert all(item["trending_score"] > 0 for item in body)


def test_tendencias_preserves_minimum_shape_and_adds_optional_score_metadata(monkeypatch):
    monkeypatch.setattr(
        dashboard_route.dashboard_service,
        "list_tendencias",
        lambda: [
            {
                "tema": "mobilitat",
                "count": 2,
                "trending_score": 7.5,
                "score": {
                    "trending_score": 7.5,
                    "delta_plens": 2.0,
                    "score_premsa": 2.0,
                    "score_xarxes": 1.0,
                    "penalty_applied": 0.8,
                    "calculated_at": "2026-05-14T11:30:00+00:00",
                },
            }
        ],
    )

    response = client.get("/api/dashboard/temas")

    assert response.status_code == 200
    item = response.json()[0]
    assert set(["tema", "count"]).issubset(item.keys())
    assert item["score"]["delta_plens"] == 2.0
    assert item["score"]["score_premsa"] == 2.0
    assert item["score"]["score_xarxes"] == 1.0
    assert item["score"]["penalty_applied"] == 0.8
    assert item["score"]["calculated_at"] == "2026-05-14T11:30:00+00:00"


def test_tendencias_returns_safe_empty_list_when_no_recent_calculation(monkeypatch):
    monkeypatch.setattr(dashboard_route.dashboard_service, "list_tendencias", lambda: [])

    response = client.get("/api/dashboard/temas")

    assert response.status_code == 200
    assert response.json() == []


def test_dashboard_service_falls_back_to_empty_list_on_missing_tables(monkeypatch):
    from psycopg2 import errors

    monkeypatch.setattr(
        dashboard_route.dashboard_service,
        "list_tendencias",
        lambda: (_ for _ in ()).throw(errors.UndefinedTable("missing")),
    )

    response = client.get("/api/dashboard/temas")

    assert response.status_code == 200
    assert response.json() == []


def test_dashboard_service_list_tendencias_sorts_filters_and_wraps_score(monkeypatch):
    from api.src.services.dashboard_service import DashboardService
    from api.src.services import dashboard_service as dashboard_service_module

    monkeypatch.setattr(
        dashboard_service_module.trending_score_service,
        "calculate_from_existing_data",
        lambda: {
            "items": [
                {
                    "tema": "tema-zero",
                    "delta_plens": 8.0,
                    "score_premsa": 0.0,
                    "score_xarxes": 0.0,
                    "base_score": 8.0,
                    "widget_penalty_multiplier": 1.0,
                    "widget_trending_score": 0.0,
                },
                {
                    "tema": "tema-top",
                    "delta_plens": 5.0,
                    "score_premsa": 2.0,
                    "score_xarxes": 1.0,
                    "base_score": 11.5,
                    "widget_penalty_multiplier": 0.8,
                    "widget_trending_score": 9.5,
                },
                {
                    "tema": "tema-mid",
                    "delta_plens": 2.0,
                    "score_premsa": 1.0,
                    "score_xarxes": 0.0,
                    "base_score": 3.0,
                    "widget_penalty_multiplier": 1.0,
                    "widget_trending_score": 3.0,
                },
            ],
            "windows": {
                "plens_recent": {"to": "2026-05-14"},
            },
        },
    )

    items = DashboardService().list_tendencias()

    assert [item["tema"] for item in items] == ["tema-top", "tema-mid"]
    assert all(item["trending_score"] > 0 for item in items)
    assert items[0]["count"] == 5
    assert items[0]["score"]["trending_score"] == 9.5
    assert items[0]["score"]["base_score"] == 11.5
    assert items[0]["score"]["delta_plens"] == 5.0
    assert items[0]["score"]["score_premsa"] == 2.0
    assert items[0]["score"]["score_xarxes"] == 1.0
    assert items[0]["score"]["penalty_applied"] == 0.8
    assert items[0]["score"]["calculated_at"] == "2026-05-14T00:00:00+00:00"


def test_dashboard_service_list_tendencias_uses_latest_available_calculation_metadata(monkeypatch):
    from api.src.services.dashboard_service import DashboardService
    from api.src.services import dashboard_service as dashboard_service_module

    monkeypatch.setattr(
        dashboard_service_module.trending_score_service,
        "calculate_from_existing_data",
        lambda: {
            "items": [
                {
                    "tema": "tema-amb-data",
                    "delta_plens": 1.0,
                    "score_premsa": 0.0,
                    "score_xarxes": 0.0,
                    "base_score": 1.0,
                    "widget_penalty_multiplier": 1.0,
                    "widget_trending_score": 1.0,
                }
            ],
            "windows": {
                "calculated_at": "2026-05-15T09:30:00+00:00",
            },
        },
    )

    items = DashboardService().list_tendencias()

    assert items[0]["score"]["calculated_at"] == "2026-05-15T09:30:00+00:00"
