"""
Read-only Google Calendar access for the bot. Uses a stored OAuth refresh
token to mint short-lived access tokens on demand (pure `requests`, no heavy
google client libs — keeps the serverless bundle small).

Env vars needed (set locally in .env and on Vercel):
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
Get the refresh token once by running: python server/google_oauth_setup.py
"""
import os

import requests

TOKEN_URI = "https://oauth2.googleapis.com/token"
CAL_API = "https://www.googleapis.com/calendar/v3"


def is_configured():
    return all(os.getenv(k) for k in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"))


def _access_token():
    r = requests.post(
        TOKEN_URI,
        data={
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "refresh_token": os.getenv("GOOGLE_REFRESH_TOKEN"),
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def list_events(time_min_iso, time_max_iso, max_results=20):
    """Return a list of events (dicts) on the primary calendar in the given range."""
    token = _access_token()
    r = requests.get(
        f"{CAL_API}/calendars/primary/events",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "timeMin": time_min_iso,
            "timeMax": time_max_iso,
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": max_results,
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json().get("items", [])


def summarize_events(events):
    """Turn raw event dicts into a short text summary for the chat/tool result."""
    if not events:
        return "No events in that range."
    lines = []
    for e in events:
        start = e.get("start", {})
        when = start.get("dateTime") or start.get("date") or "?"
        title = e.get("summary", "(no title)")
        loc = e.get("location", "")
        line = f"- {when}: {title}"
        if loc:
            line += f" @ {loc}"
        lines.append(line)
    return "\n".join(lines)
