import os
from pathlib import Path
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import anthropic
from github_vault import (
    read_file, list_dir, append_task,
    get_today_log, parse_tasks, parse_habits,
)
import reminder_core
import telegram_bot

app = Flask(__name__)
CORS(app)

_anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# ── Pages ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return {"status": "ok"}


# ── API ────────────────────────────────────────────────────────────────────────

@app.route("/api/today")
def api_today():
    log = get_today_log()
    habits_raw, _ = read_file("HABITS.md")

    return jsonify({
        "tasks": parse_tasks(log),
        "habits": parse_habits(habits_raw or ""),
        "has_log": bool(log),
    })


@app.route("/api/tasks", methods=["POST"])
def api_add_task():
    body = request.get_json(silent=True) or {}
    task = (body.get("task") or "").strip()
    if not task:
        return jsonify({"error": "task is required"}), 400
    ok = append_task(task)
    return jsonify({"ok": ok})


@app.route("/api/goals")
def api_goals():
    files = [f for f in list_dir("goals") if f.endswith(".md") and not f.startswith("_")]
    goals = []
    for f in sorted(files):
        content, _ = read_file(f"goals/{f}")
        if not content:
            continue
        title, status = f.replace(".md", "").replace("-", " ").title(), "active"
        for line in content.splitlines():
            if line.startswith("goal:"):
                title = line.replace("goal:", "").strip()
            if line.startswith("status:"):
                status = line.replace("status:", "").strip()
        goals.append({"title": title, "status": status, "slug": f.replace(".md", "")})
    return jsonify(goals)


@app.route("/api/therapy/recent")
def api_therapy_recent():
    files = sorted([f for f in list_dir("therapy") if f.endswith(".md")])
    if not files:
        return jsonify({"date": None, "affirmation": None, "insights": []})
    latest = files[-1]
    content, _ = read_file(f"therapy/{latest}")
    if not content:
        return jsonify({"date": None, "affirmation": None, "insights": []})

    affirmation, insights = None, []
    in_insights = False
    for line in content.splitlines():
        if "no longer operate from guilt" in line or "operate from peace" in line:
            affirmation = line.strip().strip(">").strip()
        if line.startswith("## Key Insights"):
            in_insights = True
            continue
        if in_insights and line.startswith("## "):
            in_insights = False
        if in_insights and line.startswith("- ") and len(insights) < 3:
            insights.append(line[2:].strip())

    return jsonify({
        "date": latest.replace(".md", ""),
        "affirmation": affirmation,
        "insights": insights,
    })


@app.route("/api/chat", methods=["POST"])
def api_chat():
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    history = body.get("history") or []
    if not message:
        return jsonify({"error": "message is required"}), 400

    # Build vault context for system prompt
    soul, _ = read_file("SOUL.md")
    memory, _ = read_file("MEMORY.md")
    log = get_today_log()

    # Most recent therapy note
    therapy_files = sorted([f for f in list_dir("therapy") if f.endswith(".md")])
    therapy_ctx = ""
    if therapy_files:
        tc, _ = read_file(f"therapy/{therapy_files[-1]}")
        therapy_ctx = f"\n\n## Most Recent Therapy Session ({therapy_files[-1].replace('.md','')})\n{tc or ''}"

    system = f"""{soul or ''}

## Active Memory
{memory or ''}

## Today's Log
{log or '(no entries yet)'}
{therapy_ctx}

You are Elizabeth's personal second brain. Be direct, warm, and structured. Draft things for her review — never claim to send or post anything. If she asks about her therapy goals, reference her actual notes above."""

    messages = []
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    response = _anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return jsonify({"reply": response.content[0].text})


@app.route("/api/telegram-webhook", methods=["POST"])
def telegram_webhook():
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if secret != os.getenv("TELEGRAM_WEBHOOK_SECRET", ""):
        return jsonify({"ok": False}), 403

    update = request.get_json(silent=True) or {}
    telegram_bot.handle_webhook_update(update)
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
