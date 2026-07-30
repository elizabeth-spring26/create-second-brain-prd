"""
Shared logic for the second brain's two-way chat + reminders: persistence,
Claude tool definitions, the tool-use loop, and the due-reminder check.
Transport-agnostic — a channel module (e.g. telegram_bot.py) calls into this
and supplies its own send function and per-channel history file.
"""
import json
import os
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import anthropic

import google_calendar
from github_vault import read_file, write_file

TZ = ZoneInfo("America/New_York")

REMINDERS_PATH = "reminders.json"
HISTORY_TURNS = 20  # user+assistant messages kept for context

_anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# ── Storage ──────────────────────────────────────────────────────────────────

def _load_json(path, default):
    content, _ = read_file(path)
    if not content:
        return default
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return default


def load_reminders():
    return _load_json(REMINDERS_PATH, [])


def save_reminders(reminders):
    write_file(REMINDERS_PATH, json.dumps(reminders, indent=2), "Update reminders")


def load_history(history_path):
    return _load_json(history_path, [])


def save_history(history_path, history):
    write_file(history_path, json.dumps(history[-HISTORY_TURNS:], indent=2), "Update chat history")


# ── Recurrence ───────────────────────────────────────────────────────────────

_REPEAT_DELTAS = {
    "daily": timedelta(days=1),
    "weekly": timedelta(weeks=1),
}


def advance_recurring(remind_at, repeat, now, until=None):
    """Return the next occurrence strictly after `now`, or None if the reminder
    is one-time or has passed its `until` cutoff (an inclusive 'YYYY-MM-DD')."""
    delta = _REPEAT_DELTAS.get(repeat)
    if delta is None:
        return None
    nxt = remind_at
    while nxt <= now:
        nxt += delta
    if until:
        try:
            cutoff = datetime.fromisoformat(until).date()
            if nxt.date() > cutoff:
                return None
        except ValueError:
            pass
    return nxt


# ── Claude tools ─────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "create_reminder",
        "description": "Schedule a reminder to be sent to Elizabeth. Can be one-time or recurring (daily/weekly).",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "What to remind her about."},
                "remind_at": {
                    "type": "string",
                    "description": "Absolute datetime in ISO 8601 format (America/New_York local time), e.g. '2026-07-30T09:00:00'. Compute this from the current time given in context plus any relative phrase she used. For a recurring reminder, this is the FIRST occurrence.",
                },
                "repeat": {
                    "type": "string",
                    "enum": ["none", "daily", "weekly"],
                    "description": "How often to repeat. 'none' for a one-time reminder (default), 'daily' for every day at that time, 'weekly' for every week on that day/time.",
                },
                "until": {
                    "type": "string",
                    "description": "Optional. For a recurring reminder, the last date it should fire (inclusive), as a date 'YYYY-MM-DD' in America/New_York. Omit for an open-ended recurring reminder. Use this when a habit changes on a known date.",
                },
            },
            "required": ["text", "remind_at"],
        },
    },
    {
        "name": "list_reminders",
        "description": "List Elizabeth's pending (not-yet-sent) reminders.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "cancel_reminder",
        "description": "Cancel a pending reminder by id.",
        "input_schema": {
            "type": "object",
            "properties": {"id": {"type": "string", "description": "The reminder id to cancel."}},
            "required": ["id"],
        },
    },
    {
        "name": "read_calendar",
        "description": "Read Elizabeth's Google Calendar events in a date range. Use when she asks what's on her calendar, schedule, or agenda.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start": {
                    "type": "string",
                    "description": "Range start as ISO 8601 in America/New_York, e.g. '2026-07-30T00:00:00'. Compute from the current time in context (e.g. today = start of today).",
                },
                "end": {
                    "type": "string",
                    "description": "Range end as ISO 8601 in America/New_York, e.g. '2026-07-30T23:59:59'.",
                },
            },
            "required": ["start", "end"],
        },
    },
]


def _run_tool(name, tool_input):
    reminders = load_reminders()

    if name == "create_reminder":
        repeat = tool_input.get("repeat", "none")
        if repeat not in ("none", "daily", "weekly"):
            repeat = "none"
        r = {
            "id": uuid.uuid4().hex[:8],
            "text": tool_input["text"],
            "remind_at": tool_input["remind_at"],
            "repeat": repeat,
            "until": tool_input.get("until") or None,
            "status": "pending",
            "created": datetime.now(TZ).isoformat(),
        }
        reminders.append(r)
        save_reminders(reminders)
        suffix = "" if repeat == "none" else f", repeating {repeat}"
        if r["until"]:
            suffix += f" until {r['until']}"
        return f"Reminder set: \"{r['text']}\" at {r['remind_at']}{suffix} (id {r['id']})"

    if name == "list_reminders":
        pending = [r for r in reminders if r["status"] == "pending"]
        if not pending:
            return "No pending reminders."
        lines = []
        for r in pending:
            rep = r.get("repeat", "none")
            rep_note = "" if rep == "none" else f" ({rep}"
            if rep != "none" and r.get("until"):
                rep_note += f" until {r['until']}"
            rep_note += ")" if rep != "none" else ""
            lines.append(f"- [{r['id']}] {r['text']} at {r['remind_at']}{rep_note}")
        return "\n".join(lines)

    if name == "cancel_reminder":
        target_id = tool_input["id"]
        found = False
        for r in reminders:
            if r["id"] == target_id and r["status"] == "pending":
                r["status"] = "cancelled"
                found = True
        save_reminders(reminders)
        return f"Cancelled reminder {target_id}." if found else f"No pending reminder found with id {target_id}."

    if name == "read_calendar":
        if not google_calendar.is_configured():
            return "Google Calendar isn't connected yet."
        try:
            events = google_calendar.list_events(tool_input["start"], tool_input["end"])
        except Exception as e:  # noqa: BLE001 — surface any API/auth error to the chat
            return f"Couldn't read the calendar: {e}"
        return google_calendar.summarize_events(events)

    return f"Unknown tool: {name}"


# ── Conversation loop ────────────────────────────────────────────────────────

def handle_incoming_message(message_body, history_path, channel_note=""):
    """Runs the Claude tool-use loop for one inbound message, returns the reply text."""
    soul, _ = read_file("SOUL.md")
    memory, _ = read_file("MEMORY.md")
    now_local = datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S %Z")

    system = f"""{soul or ''}

## Active Memory
{memory or ''}

You are Elizabeth's second brain, chatting with her {channel_note or "over text"}. Current date/time: {now_local} (America/New_York).
Keep replies short and conversational — this is a chat message, not an essay. Use the reminder tools to
schedule, list, or cancel reminders. Reminders can be one-time or recurring — if she says "every day",
"daily", "each morning", etc., set repeat="daily" (or "weekly" for weekly); otherwise leave it one-time.
If a recurring habit has a known end date, set `until`. If she asks what's on her calendar, her schedule,
or her agenda, use read_calendar. If she asks to be reminded of something but the timing is ambiguous,
ask a clarifying question before calling create_reminder. Never claim to send emails, Slack messages, or
post anywhere — texting reminders back to her is the one thing you can do autonomously."""

    history = load_history(history_path)
    messages = [{"role": h["role"], "content": h["content"]} for h in history[-HISTORY_TURNS:]]
    messages.append({"role": "user", "content": message_body})

    while True:
        response = _anthropic.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            reply = "".join(b.text for b in response.content if b.type == "text").strip()
            break

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = _run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        messages.append({"role": "user", "content": tool_results})

    messages.append({"role": "assistant", "content": reply})
    save_history(history_path, history + [
        {"role": "user", "content": message_body},
        {"role": "assistant", "content": reply},
    ])
    return reply


# ── Scheduler job ────────────────────────────────────────────────────────────

def check_due_reminders(send_fn):
    """Called on a timer. Sends any reminder whose time has passed via send_fn(text)."""
    reminders = load_reminders()
    now = datetime.now(TZ)
    changed = False

    for r in reminders:
        if r["status"] != "pending":
            continue
        try:
            remind_at = datetime.fromisoformat(r["remind_at"])
            if remind_at.tzinfo is None:
                remind_at = remind_at.replace(tzinfo=TZ)
        except ValueError:
            continue
        if remind_at <= now:
            if send_fn(f"Reminder: {r['text']}"):
                nxt = advance_recurring(remind_at, r.get("repeat", "none"), now, r.get("until"))
                if nxt is not None:
                    r["remind_at"] = nxt.isoformat()  # reschedule, stays pending
                else:
                    r["status"] = "sent"
                changed = True

    if changed:
        save_reminders(reminders)
