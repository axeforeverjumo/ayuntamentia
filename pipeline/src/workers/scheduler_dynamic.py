"""Scheduler dinámico para subscripciones.

Cada minuto comprueba qué subscripciones tocan según su cron_expr y dispara
generación de brief + envío.
"""

import logging
from datetime import datetime
from croniter import croniter

from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


def due_subscriptions(now: datetime | None = None) -> list[int]:
    """Devuelve IDs de subscripciones que deben ejecutarse ahora."""
    now = now or datetime.now()
    minute_floor = now.replace(second=0, microsecond=0)
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id, cron_expr, last_sent_at FROM subscripciones WHERE activo = TRUE"
            )
            subs = cur.fetchall()
    due = []
    for s in subs:
        try:
            it = croniter(s["cron_expr"], (s["last_sent_at"] or minute_floor).replace(second=0))
            next_fire = it.get_next(datetime)
            if next_fire <= minute_floor:
                due.append(s["id"])
        except Exception as e:
            logger.warning(f"Subscripción {s['id']} cron inválido '{s['cron_expr']}': {e}")
    return due


def send_brief(sub_id: int) -> bool:
    """Genera brief y envía por el canal configurado."""
    from ..db import get_db
    from psycopg2.extras import RealDictCursor
    # Importa el generador desde api/services (paquete diferente). Para que
    # funcione desde pipeline, replicamos llamada simple aquí.
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "api"))
    try:
        from src.services.thematic_brief import generate_brief_for_subscripcion  # type: ignore
    except Exception as e:
        logger.error(f"No se pudo cargar generator: {e}")
        return False

    brief = generate_brief_for_subscripcion(sub_id, dry_run=False)

    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT s.*, p.nombre, u.email
               FROM subscripciones s
               JOIN user_profiles p ON p.user_id = s.user_id
               JOIN auth.users u ON u.id = s.user_id
               WHERE s.id = %s""",
            (sub_id,),
        )
        sub = cur.fetchone()
    if not sub:
        return False

    sent_any = False
    if sub["canal"] in ("email", "both"):
        sent_any |= _send_email(sub["email"], f"Brief setmanal — {sub['nombre']}", brief)
    if sub["canal"] in ("telegram", "both"):
        sent_any |= _send_telegram(brief)
    return sent_any


def _send_email(to: str, subject: str, body_md: str) -> bool:
    import os, httpx
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("EMAIL_FROM", "AyuntamentIA <noreply@ayuntamentia.cat>")
    if not api_key:
        logger.warning(f"RESEND_API_KEY no configurada — skipping email a {to}")
        return False
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"from": sender, "to": [to], "subject": subject, "text": body_md},
            timeout=30,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Error enviando email: {e}")
        return False


def _send_telegram(body_md: str) -> bool:
    import os, httpx
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return False
    try:
        for chunk in [body_md[i:i+3500] for i in range(0, len(body_md), 3500)]:
            httpx.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": chunk, "parse_mode": "Markdown"},
                timeout=30,
            )
        return True
    except Exception as e:
        logger.error(f"Error enviando telegram: {e}")
        return False
