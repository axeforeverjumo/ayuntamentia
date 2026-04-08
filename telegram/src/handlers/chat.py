import os
import httpx
from telegram import Update
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")


async def handle_chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Chat libre: cualquier mensaje que no sea comando."""
    message = update.message.text
    if not message:
        return

    await update.message.reply_text("🤔 Analizando actas relevantes...")

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{API_URL}/api/chat/",
                json={"message": message, "history": []},
            )
            data = resp.json()

        answer = data.get("answer", "No pude generar una respuesta.")
        sources = data.get("sources", [])

        text = answer
        if sources:
            text += "\n\n📚 *Fuentes:*\n"
            for s in sources[:3]:
                text += f"• {s.get('municipio', '?')} — {s.get('fecha', '?')} — {s.get('tema', '?')}\n"

        # Telegram max message length is 4096
        if len(text) > 4000:
            text = text[:3997] + "..."

        await update.message.reply_text(text, parse_mode="Markdown")

    except Exception as e:
        await update.message.reply_text(f"Error al procesar: {str(e)[:200]}")
