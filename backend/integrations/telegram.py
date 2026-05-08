"""
Telegram bot integration.

One Telegram bot connects to a configured agent (TELEGRAM_AGENT_ID).
Users message the bot; it runs the agent and replies with the response.
"""
import os
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


async def start_telegram_bot():
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    agent_id = int(os.getenv("TELEGRAM_AGENT_ID", "0"))

    if not token or token == "your_telegram_bot_token_here":
        logger.info("Telegram bot token not configured — skipping Telegram integration")
        return

    if agent_id == 0:
        logger.warning("TELEGRAM_AGENT_ID not set — Telegram bot will not route messages")
        return

    try:
        from telegram import Update
        from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
        from database import SessionLocal
        from runtime.executor import execute_agent

        async def start_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            await update.message.reply_text(
                "Hi! I'm an AI agent. Send me a message and I'll respond.\n"
                "Commands:\n/start — show this message\n/help — show help"
            )

        async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            await update.message.reply_text("Just send a message and the agent will respond!")

        async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            user_msg = update.message.text
            user = update.effective_user.first_name or "User"
            logger.info(f"Telegram message from {user}: {user_msg[:80]}")

            await update.message.reply_text("Thinking...")

            db = SessionLocal()
            try:
                result = await execute_agent(
                    agent_id=agent_id,
                    message=user_msg,
                    channel="telegram",
                    context={"telegram_user": user, "telegram_chat_id": str(update.effective_chat.id)},
                    db=db,
                )
                response = result.get("response", result.get("error", "Sorry, something went wrong."))
            finally:
                db.close()

            # Telegram messages are limited to 4096 chars
            if len(response) > 4096:
                for i in range(0, len(response), 4096):
                    await update.message.reply_text(response[i:i+4096])
            else:
                await update.message.reply_text(response)

        app = Application.builder().token(token).build()
        app.add_handler(CommandHandler("start", start_cmd))
        app.add_handler(CommandHandler("help", help_cmd))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        logger.info(f"Telegram bot started — routing to agent_id={agent_id}")
        await app.initialize()
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)

        # Keep running until cancelled
        while True:
            await asyncio.sleep(3600)

    except asyncio.CancelledError:
        logger.info("Telegram bot shutting down")
        if "app" in dir():
            await app.updater.stop()
            await app.stop()
            await app.shutdown()
    except Exception as e:
        logger.error(f"Telegram bot error: {e}")
