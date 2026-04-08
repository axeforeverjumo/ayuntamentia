import os
import httpx
from telegram import Update
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")


async def handle_informe(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📊 Generando informe semanal...")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_URL}/api/informes/semanal")
        data = resp.json()

    actas = data.get("actas_semana", {}).get("actas_semana", 0)
    temas = data.get("temas", [])
    alertas = data.get("alertas", [])
    coherencia = data.get("coherencia", [])

    text = f"📊 *Informe semanal*\n\nActas procesadas: {actas}\n\n"

    if temas:
        text += "*Temas más debatidos:*\n"
        for t in temas[:5]:
            text += f"• {t['tema']}: {t['n']} puntos\n"
        text += "\n"

    if alertas:
        text += "*Alertas:*\n"
        for a in alertas:
            text += f"• {a['severidad']}: {a['n']}\n"
        text += "\n"

    if coherencia:
        text += "*Coherencia concejales AC:*\n"
        for c in coherencia[:5]:
            text += f"• {c['nombre']} ({c['municipio']}): {c['indice_coherencia']}%\n"

    await update.message.reply_text(text, parse_mode="Markdown")
