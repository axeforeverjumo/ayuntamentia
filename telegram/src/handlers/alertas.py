import os
import httpx
from telegram import Update
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")


async def handle_alertas(update: Update, context: ContextTypes.DEFAULT_TYPE):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_URL}/api/alertas/stats/resumen")
        stats = resp.json()

        resp2 = await client.get(f"{API_URL}/api/alertas/", params={"estado": "nueva", "limit": 5})
        data = resp2.json()

    text = (
        f"🔔 *Alertas pendientes*\n\n"
        f"🔴 Altas: {stats.get('altas_nuevas', 0)}\n"
        f"🟡 Medias: {stats.get('medias_nuevas', 0)}\n"
        f"🟢 Bajas: {stats.get('bajas_nuevas', 0)}\n"
        f"📊 Esta semana: {stats.get('semana', 0)}\n\n"
    )

    results = data.get("results", [])
    if results:
        text += "*Últimas alertas:*\n\n"
        for a in results:
            icon = {"alta": "🔴", "media": "🟡", "baja": "🟢"}.get(a.get("severidad"), "⚪")
            text += (
                f"{icon} *{a.get('titulo', '?')}*\n"
                f"  {a.get('municipio', '?')} — {a.get('tipo', '?')}\n"
                f"  {(a.get('descripcion', '') or '')[:150]}\n\n"
            )
    else:
        text += "✅ No hay alertas nuevas."

    await update.message.reply_text(text, parse_mode="Markdown")
