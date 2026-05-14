from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from ..auth import CurrentUser
from ..db import get_db
from .alertas_reglas_service import alertas_reglas_service

logger = logging.getLogger(__name__)

UPCOMING_MEETING_WARNING_HOURS = 72
UPCOMING_MEETING_DANGER_HOURS = 24
MVP_MEETING_STATUS_THRESHOLDS = {
    "warning_hours": UPCOMING_MEETING_WARNING_HOURS,
    "danger_hours": UPCOMING_MEETING_DANGER_HOURS,
}


class DashboardService:
    def get_dashboard_payload(self, user: CurrentUser) -> dict[str, Any]:
        return {
            "upcoming_meetings_banner": self.build_upcoming_meetings_banner(user),
        }

    def build_upcoming_meetings_banner(self, user: CurrentUser) -> Optional[dict[str, Any]]:
        rows = alertas_reglas_service.list_active_meeting_upcoming_rules(user.user_id, user.municipio_ids)
        if not rows:
            return None

        grouped_rules: dict[int, dict[str, Any]] = {}
        municipality_names: dict[int, set[str]] = defaultdict(set)

        for row in rows:
            rule_id = row["id"]
            if rule_id not in grouped_rules:
                grouped_rules[rule_id] = dict(row)
            if row.get("municipio_nombre"):
                municipality_names[rule_id].add(row["municipio_nombre"])

        meetings: list[dict[str, Any]] = []
        for rule_id, rule in grouped_rules.items():
            municipality_list = sorted(municipality_names.get(rule_id) or [])
            meeting = self._build_meeting_entry(rule, municipality_list)
            if meeting:
                meetings.append(meeting)

        if not meetings:
            return None

        meetings.sort(key=self._sort_key)
        primary = meetings[0]

        return {
            "status": primary["status"],
            "message": primary["message"],
            "thresholds": dict(MVP_MEETING_STATUS_THRESHOLDS),
            "primary_meeting": primary,
            "meetings": meetings,
            "total": len(meetings),
        }

    def _build_meeting_entry(self, rule: dict[str, Any], municipality_names: list[str]) -> Optional[dict[str, Any]]:
        meeting_at = self._ensure_aware_datetime(rule.get("meeting_at"))
        if meeting_at is None:
            logger.warning(
                "Skipping meeting_upcoming rule %s due to missing meeting_at",
                rule.get("id"),
            )
            return None

        municipality_ids = [mun_id for mun_id in (rule.get("municipios") or []) if isinstance(mun_id, int)]
        municipality_name = ", ".join(municipality_names) if municipality_names else None
        if not municipality_name:
            logger.warning(
                "Skipping meeting_upcoming rule %s due to missing municipality mapping",
                rule.get("id"),
            )
            return None

        last_processed_at = self._fetch_last_processed_at(municipality_ids, meeting_at)
        status = self._calculate_status(meeting_at, last_processed_at)
        if status is None:
            return None

        title = (rule.get("meeting_title") or rule.get("nombre") or "Reunió propera").strip()
        message = self._build_message(status, title, municipality_name, meeting_at, last_processed_at)

        return {
            "rule_id": rule.get("id"),
            "title": title,
            "municipality": municipality_name,
            "municipality_ids": municipality_ids,
            "meeting_at": meeting_at.isoformat(),
            "last_processed_at": last_processed_at.isoformat() if last_processed_at else None,
            "status": status,
            "message": message,
        }

    def _fetch_last_processed_at(self, municipio_ids: list[int], meeting_at: datetime) -> Optional[datetime]:
        if not municipio_ids:
            return None

        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT MAX(fecha) AS last_processed_at
                FROM actas
                WHERE municipio_id = ANY(%s::INTEGER[])
                  AND status = 'structured'
                  AND fecha <= %s
                """,
                (municipio_ids, meeting_at),
            )
            row = cur.fetchone()

        return self._ensure_aware_datetime(row.get("last_processed_at") if row else None)

    def _calculate_status(self, meeting_at: datetime, last_processed_at: Optional[datetime]) -> Optional[str]:
        now = datetime.now(timezone.utc)
        delta_to_meeting = meeting_at - now
        if delta_to_meeting > timedelta(hours=UPCOMING_MEETING_WARNING_HOURS):
            return None

        if last_processed_at is None:
            return "danger" if delta_to_meeting <= timedelta(hours=UPCOMING_MEETING_DANGER_HOURS) else "warning"

        if last_processed_at >= meeting_at:
            return None

        if delta_to_meeting <= timedelta(hours=UPCOMING_MEETING_DANGER_HOURS):
            return "danger"
        return "warning"

    def _build_message(
        self,
        status: str,
        title: str,
        municipality_name: str,
        meeting_at: datetime,
        last_processed_at: Optional[datetime],
    ) -> str:
        meeting_label = meeting_at.strftime("%d/%m %H:%M")
        if status == "danger":
            if last_processed_at is None:
                return f"Reunió imminent o superada a {municipality_name} ({meeting_label}) sense cap processament registrat."
            return (
                f"Reunió imminent o superada \"{title}\" a {municipality_name} ({meeting_label}) "
                f"i l'últim processament és anterior."
            )

        if last_processed_at is None:
            return f"Reunió propera a {municipality_name} ({meeting_label}) amb marge limitat i sense processament registrat."
        return (
            f"Reunió propera \"{title}\" a {municipality_name} ({meeting_label}) "
            f"amb marge limitat respecte de l'últim processament."
        )

    def _sort_key(self, item: dict[str, Any]) -> tuple[int, str]:
        severity_order = {"danger": 0, "warning": 1}
        return (severity_order.get(item["status"], 99), item["meeting_at"])

    def _ensure_aware_datetime(self, value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return None


dashboard_service = DashboardService()
