import os
import re
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")
CLIENT_PARTIDO = os.getenv("CLIENT_PARTIDO", "AC").strip()
CLIENT_NOMBRE = os.getenv("CLIENT_NOMBRE", "Aliança Catalana").strip()

GREETINGS_CA = {"hola", "hey", "bon dia", "bona tarda", "bona nit", "ei", "ep"}
GREETINGS_ES = {"hola", "hey", "buenas", "buenos dias", "buenos días", "que tal", "buenas tardes", "buenas noches"}
ALL_GREETINGS = GREETINGS_CA | GREETINGS_ES | {"hi", "hello", "ey"}

INTENT_EMOJI = {
    "atacar": "⚔️",
    "defender": "🛡️",
    "comparar": "⚖️",
    "oportunidad": "💡",
    "consulta": "🧭",
}

INTENT_LABEL = {
    "atacar": "MODE: ATAC",
    "defender": "MODE: DEFENSA",
    "comparar": "MODE: COMPARACIÓ",
    "oportunidad": "MODE: OPORTUNITAT",
    "consulta": "",
}


def _is_greeting(text: str) -> bool:
    clean = text.strip().lower().rstrip("!?.,:;")
    return clean in ALL_GREETINGS or len(clean) < 6


def _is_catalan(text: str) -> bool:
    cat_words = {"bon", "bona", "dia", "tarda", "nit", "ei", "ep", "què", "com"}
    return bool(set(text.lower().split()) & cat_words)


def _greeting_response(catalan: bool) -> str:
    if catalan:
        return (
            f"Hola! 👋 Sóc l'arma política de *{CLIENT_NOMBRE}*.\n\n"
            "Puc ajudar-te amb:\n"
            "⚔️ Atacar rivals amb dades reals\n"
            f"🛡️ Defensar posicions de {CLIENT_PARTIDO}\n"
            "⚖️ Comparar partits en qualsevol tema\n"
            "💡 Detectar oportunitats polítiques\n\n"
            "Prova per exemple:\n"
            f"  _Què s'ha dit de {CLIENT_NOMBRE} aquest mes?_\n"
            "  _Comparar ERC vs PSC en immigració 2026_\n"
            f"  _On pot créixer {CLIENT_PARTIDO} ara?_"
        )
    return (
        f"Hola! 👋 Soy el arma política de *{CLIENT_NOMBRE}*.\n\n"
        "Puedo ayudarte con:\n"
        "⚔️ Atacar rivales con datos reales\n"
        f"🛡️ Defender posiciones de {CLIENT_PARTIDO}\n"
        "⚖️ Comparar partidos en cualquier tema\n"
        "💡 Detectar oportunidades políticas\n\n"
        "Prueba por ejemplo:\n"
        f"  _¿Qué se ha dicho de {CLIENT_NOMBRE} este mes?_\n"
        "  _Comparar ERC vs PSC en inmigración 2026_\n"
        f"  _¿Dónde puede crecer {CLIENT_PARTIDO} ahora?_"
    )


# Caracteres a escapar en MarkdownV2 de Telegram cuando queden fuera de entidades.
# Usamos MarkdownV1 (parse_mode="Markdown") que es más permisivo pero solo soporta
# *bold*, _italic_, `code` y ```pre```. Los headers ## no se renderizan.
def _transform_markdown_for_telegram(md: str, intent: str = "consulta") -> str:
    """Convierte el markdown estructurado del chat al formato de Telegram."""
    text = md or ""

    # Badge de intent al principio si no es consulta
    header_badge = ""
    if intent and intent != "consulta":
        emoji = INTENT_EMOJI.get(intent, "🧭")
        label = INTENT_LABEL.get(intent, "")
        if label:
            header_badge = f"{emoji} *{label}*\n\n"

    # ## Headers → emoji + *bold*
    text = re.sub(r'^##\s*Veredict[oe]\s*$', '🎯 *VEREDICTE*', text, flags=re.MULTILINE)
    text = re.sub(r'^##\s*(Punts clau|Puntos clave|Punts|Puntos)\s*$', '📌 *PUNTS CLAU*', text, flags=re.MULTILINE)
    text = re.sub(r'^##\s*(I ara què\??|Y ahora qué\??|Ara què\??|Ahora qué\??)\s*$', '⚡ *I ARA QUÈ?*', text, flags=re.MULTILINE)
    # H1/H3 genéricos
    text = re.sub(r'^#{1,3}\s+(.+)$', r'*\1*', text, flags=re.MULTILINE)

    # Citas (blockquote `> "..."`)
    text = re.sub(r'^>\s*', '💬 ', text, flags=re.MULTILINE)

    # Bullets con "- " → "• "
    text = re.sub(r'^(\s*)-\s+', r'\1• ', text, flags=re.MULTILINE)

    # MarkdownV1 no soporta ** (solo *). react-markdown puede generar **. Convertir **x** → *x*
    text = re.sub(r'\*\*([^*\n]+)\*\*', r'*\1*', text)

    # Doble espacio al final de línea que la API añade para break no hace nada en Telegram, quitar
    text = re.sub(r'  +\n', '\n', text)

    # Limpiar múltiples blank lines
    text = re.sub(r'\n{3,}', '\n\n', text).strip()

    return header_badge + text


def _sanitize_for_markdown_v1(text: str) -> str:
    """Telegram MarkdownV1: los caracteres problemáticos son _ * ` [.
    No escapamos porque rompe formato, pero sí cerramos balances impares."""
    for ch in ("*", "_", "`"):
        if text.count(ch) % 2 == 1:
            text += ch
    return text


def _format_sources(sources: list) -> str:
    relevant = [s for s in sources if s.get("municipio") or s.get("titulo")]
    if not relevant:
        return ""
    out = "\n\n📋 *Fonts consultades:*"
    for s in relevant[:4]:
        muni = s.get("municipio") or "?"
        fecha = s.get("fecha") or ""
        # Recortar fecha a DD/MM/YYYY si es ISO
        if fecha and len(fecha) >= 10:
            try:
                y, m, d = fecha[:10].split("-")
                fecha = f"{d}/{m}/{y}"
            except Exception:
                fecha = fecha[:10]
        tema = s.get("tema") or ""
        tema_str = f" · {tema}" if tema and tema != "procedimiento" else ""
        out += f"\n• _{muni}_ ({fecha}){tema_str}"
    return out


def _build_followup_keyboard(follow_ups: list) -> InlineKeyboardMarkup | None:
    """Crea botones inline con las preguntas de seguimiento."""
    if not follow_ups:
        return None
    buttons = []
    for i, q in enumerate(follow_ups[:3]):
        q_short = q if len(q) <= 60 else q[:57] + "…"
        # callback_data tiene límite de 64 bytes; usamos índice y guardamos pregunta en context
        buttons.append([InlineKeyboardButton(f"💬 {q_short}", callback_data=f"fu:{i}")])
    return InlineKeyboardMarkup(buttons)


async def handle_chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Chat libre: cualquier mensaje que no sea comando."""
    message = update.message.text
    if not message:
        return

    # Greeting detection
    if _is_greeting(message):
        await update.message.reply_text(
            _greeting_response(_is_catalan(message)),
            parse_mode="Markdown",
        )
        return

    thinking = await update.message.reply_text("🔍 Cercant en 947 municipis…")

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{API_URL}/api/chat/",
                json={"message": message, "history": []},
            )
            data = resp.json()

        answer = data.get("answer", "No he pogut generar una resposta.")
        sources = data.get("sources", [])
        follow_ups = data.get("follow_ups", [])
        intent = data.get("intent", "consulta")

        # Transform markdown to Telegram-friendly
        body = _transform_markdown_for_telegram(answer, intent)
        body += _format_sources(sources)
        body = _sanitize_for_markdown_v1(body)

        # Telegram message limit is 4096 chars
        if len(body) > 4000:
            body = body[:3997] + "…"

        # Store follow_ups in context for button callbacks
        context.user_data["last_followups"] = follow_ups

        try:
            await thinking.delete()
        except Exception:
            pass

        keyboard = _build_followup_keyboard(follow_ups)

        try:
            await update.message.reply_text(body, parse_mode="Markdown", reply_markup=keyboard)
        except Exception:
            # Si el parse de markdown falla, reenviar como texto plano sin formato
            plain = re.sub(r'[*_`]', '', body)
            await update.message.reply_text(plain, reply_markup=keyboard)

    except Exception:
        try:
            await thinking.delete()
        except Exception:
            pass
        await update.message.reply_text(
            "❌ No he pogut processar la teva pregunta. Torna-ho a intentar en uns segons."
        )


async def handle_followup_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde a los botones inline de follow-up."""
    query = update.callback_query
    if not query or not query.data or not query.data.startswith("fu:"):
        return

    try:
        idx = int(query.data.split(":")[1])
    except (ValueError, IndexError):
        await query.answer()
        return

    followups = context.user_data.get("last_followups", [])
    if idx >= len(followups):
        await query.answer("Pregunta no disponible")
        return

    question = followups[idx]
    await query.answer()

    # Enviar la pregunta como si el usuario la hubiera escrito
    # Reutilizamos handle_chat creando un pseudo-update
    await query.message.reply_text(f"➡️ _{question}_", parse_mode="Markdown")

    # Reenviar el mensaje al handler principal
    update.message = query.message  # type: ignore
    update.message.text = question  # type: ignore
    await handle_chat(update, context)
