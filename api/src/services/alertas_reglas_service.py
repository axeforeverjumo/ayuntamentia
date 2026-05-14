from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor

from ..db import get_db


class AlertasReglasService:
    def list_active_meeting_upcoming_rules(self, user_id: str, municipio_ids: list[int]) -> list[dict[str, Any]]:
        if not municipio_ids:
            return []

        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT
                    r.id,
                    r.user_id,
                    r.nombre,
                    r.descripcion,
                    r.municipios,
                    r.severidad,
                    r.activa,
                    r.tipo_regla,
                    r.meeting_title,
                    r.meeting_at,
                    r.special_channel,
                    m.id AS municipio_id,
                    m.nombre AS municipio_nombre
                FROM alertas_reglas r
                LEFT JOIN municipios m
                  ON m.id = ANY(COALESCE(r.municipios, ARRAY[]::INTEGER[]))
                WHERE r.user_id = %s
                  AND r.activa = TRUE
                  AND r.tipo_regla = 'meeting_upcoming'
                  AND COALESCE(r.special_channel, 'dashboard') = 'dashboard'
                  AND COALESCE(array_length(r.municipios, 1), 0) > 0
                  AND r.municipios && %s::INTEGER[]
                ORDER BY r.meeting_at ASC NULLS LAST, r.id ASC, m.nombre ASC
                """,
                (user_id, municipio_ids),
            )
            return [dict(row) for row in cur.fetchall()]


alertas_reglas_service = AlertasReglasService()
