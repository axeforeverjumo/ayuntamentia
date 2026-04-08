import os
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")


async def handle_search(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = " ".join(context.args) if context.args else ""
    if not query:
        await update.message.reply_text(
            "Ús: `/buscar <terme>`\n\n"
            "Exemples:\n"
            "  `/buscar pressupost Ripoll`\n"
            "  `/buscar urbanisme Girona`\n"
            "  `/buscar moció immigració`",
            parse_mode="Markdown",
        )
        return

    thinking = await update.message.reply_text(f"🔍 Cercant: _{query}_...", parse_mode="Markdown")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{API_URL}/api/search/", params={"q": query, "limit": 5})
            data = resp.json()

        total = data.get("total", 0)
        results = data.get("results", [])

        try:
            await thinking.delete()
        except Exception:
            pass

        if not results:
            await update.message.reply_text("No s'han trobat resultats. Prova amb altres paraules clau.")
            return

        text = f"📋 *{total} resultats* per a \"{query}\":\n\n"
        buttons = []
        for r in results[:5]:
            status = "✅" if r.get("status") == "structured" else "📄"
            text += f"{status} *{r.get('municipio', r.get('nom_ens', '?'))}* — {r.get('fecha', '?')}\n"
            snippet = r.get("snippet", "")
            if snippet:
                clean = snippet.replace("<mark>", "").replace("</mark>", "")[:150]
                text += f"  _{clean}_\n\n"
            if r.get("id"):
                buttons.append([InlineKeyboardButton(
                    f"📋 {r.get('municipio', '?')} ({r.get('fecha', '?')})",
                    url=f"https://alianza-catalana.factoriaia.com/actas/{r['id']}"
                )])

        reply_markup = InlineKeyboardMarkup(buttons) if buttons else None
        await update.message.reply_text(text, parse_mode="Markdown", reply_markup=reply_markup)

    except Exception as e:
        try:
            await thinking.delete()
        except Exception:
            pass
        await update.message.reply_text("❌ Error en la cerca. Torna-ho a intentar.")


async def handle_municipio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = " ".join(context.args) if context.args else ""
    if not query:
        await update.message.reply_text(
            "Ús: `/municipio <nom>`\n\nExemple: `/municipio Ripoll`",
            parse_mode="Markdown",
        )
        return

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{API_URL}/api/municipios/", params={"q": query, "limit": 1})
            data = resp.json()

        results = data.get("results", [])
        if not results:
            await update.message.reply_text(f"No he trobat cap municipi: _{query}_", parse_mode="Markdown")
            return

        m = results[0]
        mid = m["id"]

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{API_URL}/api/municipios/{mid}")
            detail = resp.json()

        comp = detail.get("composicion", [])
        comp_lines = "\n".join([
            f"  {'🔵' if 'ALIAN' in c['partido'].upper() else '⚪'} {c['partido']}: *{c['count']}*"
            for c in comp
        ])

        pob = detail.get("poblacion")
        pob_text = f"{pob:,}".replace(",", ".") if pob else "?"

        text = (
            f"🏛️ *{detail.get('nombre', '?')}*\n"
            f"📍 {detail.get('comarca', '?')} · {detail.get('provincia', '?')}\n"
            f"👥 {pob_text} habitants\n"
            f"{'✅ Aliança Catalana present' if detail.get('tiene_ac') else ''}\n\n"
            f"*Composició del ple:*\n{comp_lines}\n\n"
        )

        plenos = detail.get("ultimos_plenos", [])
        if plenos:
            text += "*Últims plens processats:*\n"
            for p in plenos[:5]:
                text += f"  📋 {p['fecha']} — {p.get('tipo', '?')} — {p.get('num_puntos', 0)} punts\n"

        alertas = detail.get("alertas", {})
        if any(v for v in alertas.values() if v):
            text += f"\n*Alertes:* 🔴 {alertas.get('altas', 0)} · 🟡 {alertas.get('medias', 0)} · 🟢 {alertas.get('bajas', 0)}"

        buttons = [[InlineKeyboardButton(
            "🌐 Veure al web",
            url=f"https://alianza-catalana.factoriaia.com/municipios/{mid}"
        )]]

        await update.message.reply_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(buttons))

    except Exception:
        await update.message.reply_text("❌ Error al consultar el municipi.")
