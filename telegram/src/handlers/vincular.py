"""Handler /vincular CODIGO — vincula el chat Telegram con un usuario AyuntamentIA."""

import os
import logging
from telegram import Update
from telegram.ext import ContextTypes
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")


async def handle_vincular(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text(
            "Ús: /vincular CODI\n\nObté el codi a la web → Subscripcions → 'Vincular Telegram'."
        )
        return
    code = args[0].strip().upper()
    chat_id = update.effective_chat.id

    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT user_id FROM telegram_link_codes
               WHERE code=%s AND used_at IS NULL AND expires_at > NOW()""",
            (code,),
        )
        row = cur.fetchone()
        if not row:
            await update.message.reply_text("❌ Codi invàlid o expirat. Genera'n un de nou a la web.")
            return
        user_id = row["user_id"]
        cur.execute("UPDATE user_profiles SET telegram_chat_id=%s WHERE user_id=%s",
                    (chat_id, user_id))
        cur.execute("UPDATE telegram_link_codes SET used_at=NOW() WHERE code=%s", (code,))
        conn.commit()
        await update.message.reply_text(
            "✅ Compte vinculat. A partir d'ara els teus briefs i alertes arribaran aquí."
        )
    except Exception as e:
        logger.error(f"vincular: {e}")
        await update.message.reply_text("Error intern. Torna-ho a provar més tard.")
    finally:
        conn.close()
