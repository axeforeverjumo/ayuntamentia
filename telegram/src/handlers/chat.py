import os
import httpx
from telegram import Update
from telegram.ext import ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:8050")

GREETINGS = {"hola", "hey", "bon dia", "bona tarda", "bona nit", "hi", "hello", "buenas", "buenos dias", "que tal", "ey", "ei"}


def _is_greeting(text: str) -> bool:
    clean = text.strip().lower().rstrip("!?.,:;")
    return clean in GREETINGS or len(clean) < 6


GREETING_RESPONSE = (
    "Hola! 👋 Sóc l'assistent d'AyuntamentIA.\n\n"
    "Puc ajudar-te amb:\n"
    "• Buscar informació d'actes de plens municipals\n"
    "• Consultar votacions i acords\n"
    "• Analitzar l'activitat d'Aliança Catalana\n\n"
    "Prova per exemple:\n"
    "  _Què s'ha aprovat a Ripoll?_\n"
    "  _Com vota AC sobre urbanisme?_\n"
    "  _/buscar pressupost Ripoll_\n"
    "  _/municipio Ripoll_"
)


async def handle_chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Chat libre: cualquier mensaje que no sea comando."""
    message = update.message.text
    if not message:
        return

    # Greeting detection
    if _is_greeting(message):
        await update.message.reply_text(GREETING_RESPONSE, parse_mode="Markdown")
        return

    thinking = await update.message.reply_text("🔍 Buscant informació als plens municipals...")

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{API_URL}/api/chat/",
                json={"message": message, "history": []},
            )
            data = resp.json()

        answer = data.get("answer", "No he pogut generar una resposta.")
        sources = data.get("sources", [])

        # Only show sources if they have real content
        relevant_sources = [s for s in sources if s.get("tema") or s.get("titulo")]
        if relevant_sources:
            answer += "\n\n📋 *Fonts:*"
            for s in relevant_sources[:3]:
                label = s.get("titulo") or s.get("tema") or "Acta"
                if len(label) > 50:
                    label = label[:47] + "..."
                answer += f"\n• _{s.get('municipio', '?')}_ ({s.get('fecha', '?')})"

        if len(answer) > 4000:
            answer = answer[:3997] + "..."

        # Delete "thinking" message and send real answer
        try:
            await thinking.delete()
        except Exception:
            pass

        await update.message.reply_text(answer, parse_mode="Markdown")

    except Exception as e:
        try:
            await thinking.delete()
        except Exception:
            pass
        await update.message.reply_text(
            "❌ No he pogut processar la teva pregunta. Torna-ho a intentar en uns segons."
        )
