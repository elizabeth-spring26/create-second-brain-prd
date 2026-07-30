"""
Runs on a GitHub Actions schedule. Reads reminders.json directly from the
checked-out repo, texts any that are due via Telegram, and marks them sent.
The workflow commits the updated file back. Kept dependency-free (just
`requests`) since it runs in a bare Actions runner, not the app's venv.
"""
import json
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

TZ = ZoneInfo("America/New_York")
REMINDERS_FILE = "Elizabeth-Brain/Memory/reminders.json"


def send_telegram(text):
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat_id = os.environ["TELEGRAM_CHAT_ID"]
    r = requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text},
        timeout=10,
    )
    return r.status_code == 200


def main():
    if not os.path.exists(REMINDERS_FILE):
        print("No reminders.json yet — nothing to check.")
        return

    with open(REMINDERS_FILE, encoding="utf-8") as f:
        reminders = json.load(f)

    now = datetime.now(TZ)
    changed = False

    for r in reminders:
        if r["status"] != "pending":
            continue
        try:
            remind_at = datetime.fromisoformat(r["remind_at"])
        except ValueError:
            continue
        if remind_at.tzinfo is None:
            remind_at = remind_at.replace(tzinfo=TZ)
        if remind_at <= now:
            if send_telegram(f"Reminder: {r['text']}"):
                r["status"] = "sent"
                changed = True

    if changed:
        with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(reminders, f, indent=2)
        print("Sent due reminders and updated reminders.json.")
    else:
        print("No due reminders.")


if __name__ == "__main__":
    main()
