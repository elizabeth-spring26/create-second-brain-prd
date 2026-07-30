"""
One-time setup: after deploying to Vercel, run this to tell Telegram where
to send messages. Needs TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in
.env, plus the deployed URL as the first argument.

Usage: python server/telegram_set_webhook.py https://your-app.vercel.app
"""
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

if len(sys.argv) != 2:
    print("Usage: python server/telegram_set_webhook.py https://your-app.vercel.app")
    sys.exit(1)

base_url = sys.argv[1].rstrip("/")
token = os.getenv("TELEGRAM_BOT_TOKEN")
secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")

if not token or not secret:
    print("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env first.")
    sys.exit(1)

r = requests.post(
    f"https://api.telegram.org/bot{token}/setWebhook",
    json={
        "url": f"{base_url}/api/telegram-webhook",
        "secret_token": secret,
    },
    timeout=10,
)
print(r.status_code, r.json())
