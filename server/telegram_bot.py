"""
Telegram transport for the second brain. Runs as a webhook handler (called
per-message by app.py's /api/telegram-webhook route) rather than long-polling,
since serverless functions don't have a persistent process to poll from.
"""
import os

import requests

import reminder_core

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")  # only this chat is trusted

API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}" if TELEGRAM_BOT_TOKEN else None
HISTORY_PATH = "telegram_history.json"


def send_message(text):
    if not API_BASE or not TELEGRAM_CHAT_ID:
        return False
    r = requests.post(f"{API_BASE}/sendMessage", json={"chat_id": TELEGRAM_CHAT_ID, "text": text}, timeout=10)
    return r.status_code == 200


def handle_webhook_update(update):
    """Called once per inbound Telegram update by the /api/telegram-webhook route."""
    message = update.get("message")
    if not message or "text" not in message:
        return

    chat_id = str(message["chat"]["id"])
    if TELEGRAM_CHAT_ID and chat_id != TELEGRAM_CHAT_ID:
        return  # ignore anyone but Elizabeth

    reply = reminder_core.handle_incoming_message(
        message["text"], history_path=HISTORY_PATH, channel_note="over Telegram"
    )
    send_message(reply)
