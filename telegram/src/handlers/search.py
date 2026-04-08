import os
import httpx
from telegram import Update
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")


async def handle_search(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = " ".join(context.args) if context.args else ""
    if not query:
        await update.message.reply_text("Uso: /buscar <término de búsqueda>")
        return

    await update.message.reply_text(f"🔍 Buscando: _{query}_...", parse_mode="Markdown")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_URL}/api/search/", params={"q": query, "limit": 5})
        data = resp.json()

    total = data.get("total", 0)
    results = data.get("results", [])

    if not results:
        await update.message.reply_text("No se encontraron resultados.")
        return

    text = f"📋 *{total} resultados* para \"{query}\":\n\n"
    for r in results[:5]:
        text += f"• *{r.get('municipio', '?')}* — {r.get('fecha', '?')}\n"
        snippet = r.get("snippet", "")
        if snippet:
            clean = snippet.replace("<mark>", "*").replace("</mark>", "*")
            text += f"  {clean[:200]}\n\n"

    await update.message.reply_text(text, parse_mode="Markdown")


async def handle_municipio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = " ".join(context.args) if context.args else ""
    if not query:
        await update.message.reply_text("Uso: /municipio <nombre>")
        return

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_URL}/api/municipios/", params={"q": query, "limit": 1})
        data = resp.json()

    results = data.get("results", [])
    if not results:
        await update.message.reply_text(f"No encontré municipio: {query}")
        return

    m = results[0]
    mid = m["id"]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_URL}/api/municipios/{mid}")
        detail = resp.json()

    comp = detail.get("composicion", [])
    comp_text = " · ".join([f"{c['partido']}: {c['count']}" for c in comp])

    text = (
        f"🏛️ *{detail.get('nombre', '?')}*\n"
        f"Comarca: {detail.get('comarca', '?')} · Provincia: {detail.get('provincia', '?')}\n"
        f"Población: {detail.get('poblacion', '?')}\n"
        f"AC presente: {'✅' if detail.get('tiene_ac') else '❌'}\n\n"
        f"*Composición:* {comp_text}\n\n"
        f"*Últimos plenos:*\n"
    )
    for p in detail.get("ultimos_plenos", [])[:5]:
        text += f"• {p['fecha']} — {p['tipo']} — {p['num_puntos']} puntos\n"

    alertas = detail.get("alertas", {})
    if alertas:
        text += f"\n*Alertas:* 🔴 {alertas.get('altas', 0)} · 🟡 {alertas.get('medias', 0)} · 🟢 {alertas.get('bajas', 0)}"

    await update.message.reply_text(text, parse_mode="Markdown")
