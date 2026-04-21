"""Bot de Telegram para AjuntamentIA."""

import os
import logging

from dotenv import load_dotenv
from telegram import Update, BotCommand
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

from .handlers import search, alertas, chat, informes, vincular

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = os.getenv("API_URL", "http://localhost:8050")
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if args and args[0].startswith("vincular_"):
        context.args = [args[0].replace("vincular_", "", 1)]
        await vincular.handle_vincular(update, context)
        return
    await update.message.reply_text(
        "👋 *AjuntamentIA* — Inteligencia política de Catalunya\n\n"
        "Comandos disponibles:\n"
        "/buscar <query> — Buscar en actas de plenos\n"
        "/municipio <nombre> — Info de un municipio\n"
        "/alertas — Ver alertas pendientes\n"
        "/informe — Resumen semanal\n"
        "O simplemente escribe tu pregunta y te responderé.",
        parse_mode="Markdown"
    )


async def set_commands(app: Application):
    await app.bot.set_my_commands([
        BotCommand("start", "Iniciar el bot"),
        BotCommand("vincular", "Vincular el compte amb la web"),
        BotCommand("buscar", "Buscar en actas de plenos"),
        BotCommand("municipio", "Info de un municipio"),
        BotCommand("alertas", "Ver alertas pendientes"),
        BotCommand("informe", "Resumen semanal"),
    ])


def main():
    if not TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set")
        return

    app = Application.builder().token(TOKEN).post_init(set_commands).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("vincular", vincular.handle_vincular))
    app.add_handler(CommandHandler("buscar", search.handle_search))
    app.add_handler(CommandHandler("municipio", search.handle_municipio))
    app.add_handler(CommandHandler("alertas", alertas.handle_alertas))
    app.add_handler(CommandHandler("informe", informes.handle_informe))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat.handle_chat))

    logger.info("Bot starting...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
