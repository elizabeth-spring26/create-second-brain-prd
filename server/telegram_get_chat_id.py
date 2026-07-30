"""
One-time helper: after creating a bot via @BotFather and setting
TELEGRAM_BOT_TOKEN in .env, message the bot once from Telegram, then run
this script to find your chat_id — put that in .env as TELEGRAM_CHAT_ID.

Run this BEFORE telegram_set_webhook.py — Telegram disables getUpdates
(what this script uses) once a webhook is registered on the bot.
"""
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

token = os.getenv("TELEGRAM_BOT_TOKEN")
if not token:
    print("Set TELEGRAM_BOT_TOKEN in .env first, then rerun this.")
    sys.exit(1)

r = requests.get(f"https://api.telegram.org/bot{token}/getUpdates", timeout=10)
data = r.json()

if not data.get("result"):
    print("No messages yet — open your bot in Telegram, send it any message, then rerun this script.")
    sys.exit(0)

seen = set()
for update in data["result"]:
    msg = update.get("message")
    if not msg:
        continue
    chat = msg["chat"]
    if chat["id"] in seen:
        continue
    seen.add(chat["id"])
    name = chat.get("username") or chat.get("first_name") or "unknown"
    print(f"chat_id={chat['id']}  from={name}  text={msg.get('text', '')!r}")
