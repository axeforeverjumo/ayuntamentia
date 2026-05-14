import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")

from api.src.auth import CurrentUser  # noqa: E402
from api.src.main import app  # noqa: E402
from api.src.routes import dashboard as dashboard_route  # noqa: E402
import importlib  # noqa: E402

dashboard_service_module = importlib.import_module("api.src.services.dashboard_service")  # noqa: E402
from api.src.services.dashboard_service import (  # noqa: E402
    MVP_MEETING_STATUS_THRESHOLDS,
    UPCOMING_MEETING_DANGER_HOURS,
    UPCOMING_MEETING_WARNING_HOURS,
    DashboardService,
)
from api.src.services.alertas_reglas_service import alertas_reglas_service  # noqa: E402


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows
        self.last_query = ""
        self.params = None

    def execute(self, query, params=None):
        self.last_query = query
        self.params = params

    def fetchone(self):
        if "MAX(fecha)" in self.last_query:
            meeting_at = self.params[1]
            municipality_ids = tuple(self.params[0])
            return {
                "last_processed_at": self.rows.get((municipality_ids, meeting_at))
            }
        return None


class FakeConn:
    def __init__(self, rows):
        self.rows = rows

    def cursor(self, cursor_factory=None):
        return FakeCursor(self.rows)

    def commit(self):
        return None

    def rollback(self):
        return None

    def close(self):
        return None


class FakeContextManager:
    def __init__(self, rows):
        self.rows = rows

    def __enter__(self):
        return FakeConn(self.rows)

    def __exit__(self, exc_type, exc, tb):
        return False


def _make_user() -> CurrentUser:
    return CurrentUser(
        user_id="user-1",
        email="demo@example.com",
        profile={"nombre": "Demo", "rol": "concejal", "activo": True},
        areas=[],
        municipio_ids=[101, 202],
    )


def test_build_upcoming_meetings_banner_warning(monkeypatch):
    service = DashboardService()
    user = _make_user()
    now = datetime.now(timezone.utc)
    meeting_at = now + timedelta(hours=UPCOMING_MEETING_DANGER_HOURS + 8)
    last_processed_at = now - timedelta(hours=2)

    monkeypatch.setattr(
        alertas_reglas_service,
        "list_active_meeting_upcoming_rules",
        lambda user_id, municipio_ids: [
            {
                "id": 11,
                "nombre": "Ple ordinari",
                "meeting_title": "Ple ordinari",
                "meeting_at": meeting_at,
                "municipios": [101],
                "municipio_nombre": "Vic",
            }
        ],
    )
    monkeypatch.setattr(
        dashboard_service_module,
        "get_db",
        lambda: FakeContextManager({((101,), meeting_at): last_processed_at}),
    )

    payload = service.build_upcoming_meetings_banner(user)

    assert payload is not None
    assert payload["status"] == "warning"
    assert payload["primary_meeting"]["status"] == "warning"
    assert payload["primary_meeting"]["title"] == "Ple ordinari"
    assert payload["primary_meeting"]["municipality"] == "Vic"
    assert payload["primary_meeting"]["last_processed_at"] == last_processed_at.isoformat()
    assert payload["thresholds"] == MVP_MEETING_STATUS_THRESHOLDS


def test_build_upcoming_meetings_banner_danger(monkeypatch):
    service = DashboardService()
    user = _make_user()
    now = datetime.now(timezone.utc)
    meeting_at = now + timedelta(hours=UPCOMING_MEETING_DANGER_HOURS - 2)
    last_processed_at = now - timedelta(days=2)

    monkeypatch.setattr(
        alertas_reglas_service,
        "list_active_meeting_upcoming_rules",
        lambda user_id, municipio_ids: [
            {
                "id": 12,
                "nombre": "Comissió urgent",
                "meeting_title": "Comissió urgent",
                "meeting_at": meeting_at,
                "municipios": [202],
                "municipio_nombre": "Manlleu",
            }
        ],
    )
    monkeypatch.setattr(
        dashboard_service_module,
        "get_db",
        lambda: FakeContextManager({((202,), meeting_at): last_processed_at}),
    )

    payload = service.build_upcoming_meetings_banner(user)

    assert payload is not None
    assert payload["status"] == "danger"
    assert payload["primary_meeting"]["status"] == "danger"
    assert "imminent o superada" in payload["primary_meeting"]["message"]


def test_build_upcoming_meetings_banner_returns_none_without_alert(monkeypatch):
    service = DashboardService()
    user = _make_user()
    now = datetime.now(timezone.utc)
    meeting_at = now + timedelta(hours=UPCOMING_MEETING_WARNING_HOURS + 12)
    last_processed_at = now

    monkeypatch.setattr(
        alertas_reglas_service,
        "list_active_meeting_upcoming_rules",
        lambda user_id, municipio_ids: [
            {
                "id": 13,
                "nombre": "Ple llunyà",
                "meeting_title": "Ple llunyà",
                "meeting_at": meeting_at,
                "municipios": [101],
                "municipio_nombre": "Vic",
            }
        ],
    )
    monkeypatch.setattr(
        dashboard_service_module,
        "get_db",
        lambda: FakeContextManager({((101,), meeting_at): last_processed_at}),
    )

    payload = service.build_upcoming_meetings_banner(user)

    assert payload is None


def test_build_upcoming_meetings_banner_degrades_on_partial_rule(monkeypatch, caplog):
    service = DashboardService()
    user = _make_user()

    monkeypatch.setattr(
        alertas_reglas_service,
        "list_active_meeting_upcoming_rules",
        lambda user_id, municipio_ids: [
            {
                "id": 14,
                "nombre": "Regla incompleta",
                "meeting_title": "Regla incompleta",
                "meeting_at": None,
                "municipios": [101],
                "municipio_nombre": "Vic",
            }
        ],
    )

    payload = service.build_upcoming_meetings_banner(user)

    assert payload is None
    assert "missing meeting_at" in caplog.text


def test_dashboard_endpoint_includes_optional_banner(monkeypatch):
    client = TestClient(app)
    user = _make_user()
    banner_payload = {
        "status": "warning",
        "message": "Reunió propera a Vic.",
        "thresholds": {"warning_hours": 72, "danger_hours": 24},
        "primary_meeting": {
            "rule_id": 15,
            "title": "Ple ordinari",
            "municipality": "Vic",
            "municipality_ids": [101],
            "meeting_at": "2026-01-01T10:00:00+00:00",
            "last_processed_at": "2025-12-31T09:00:00+00:00",
            "status": "warning",
            "message": "Reunió propera a Vic.",
        },
        "meetings": [],
        "total": 1,
    }

    app.dependency_overrides[dashboard_route.get_current_user] = lambda: user
    monkeypatch.setattr(
        dashboard_route.dashboard_service,
        "get_dashboard_payload",
        lambda current_user: {"upcoming_meetings_banner": banner_payload},
    )

    response = client.get("/api/dashboard/")

    assert response.status_code == 200
    body = response.json()
    assert "upcoming_meetings_banner" in body
    assert body["upcoming_meetings_banner"]["status"] == "warning"
    assert body["upcoming_meetings_banner"]["primary_meeting"]["municipality"] == "Vic"

    app.dependency_overrides.clear()
