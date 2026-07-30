# Elizabeth's Second Brain — Product Requirements Document

**Generated:** 2026-06-28  
**Owner:** Elizabeth Tran (Founder / Student)  
**Timezone:** EST  

## Summary

Build a local AI second brain that acts as Elizabeth's Advisor — drafting email replies, surfacing therapy-aligned goals, managing a manual daily task list, summarizing meetings/calendar, and running a morning accountability heartbeat. Google (Gmail, Calendar, Drive) is the only external integration required.

---

## Phase 1: Foundation (Memory Layer)
**Status: DONE**

Your vault already exists at `Elizabeth-Brain/Memory/`. The core files are in place.

### Remaining setup (15 min)
Update these files with your specific details:

**`Elizabeth-Brain/Memory/USER.md`** — add:
```
Gmail: tranelizabeth0201@gmail.com
Wake-up goal: 8:00 AM EST
Wind-down goal: 9:00–10:00 PM EST
Google Calendar: primary
Google Drive: primary cloud storage
```

**`Elizabeth-Brain/Memory/HABITS.md`** — your 5 daily pillars:
```
- [ ] Morning anchor (gym + quiet time)
- [ ] Deep work block (founder/student tasks)
- [ ] Connection (follow up with at least 1 person)
- [ ] Learning (podcast, book, or research)
- [ ] Evening reflection (journal + prayer)
```

**Add new folder:** `Elizabeth-Brain/Memory/therapy/`  
This is where you paste session notes (see Phase 5).

**Add new folder:** `Elizabeth-Brain/Memory/goals/`  
Store active goals here, each as its own `.md` file.

**Key files:** `Elizabeth-Brain/Memory/USER.md`, `HABITS.md`, `SOUL.md`  
**Complexity:** Low  
**Dependency:** None

---

## Phase 2: Hooks (Context Persistence)
**What:** Three Python scripts that automatically inject your memory into every Claude session, and save important things before the session ends.

### Files to create
```
.claude/
  hooks/
    session-start-context.py
    pre-compact-flush.py
    session-end-flush.py
  settings.json          ← register the hooks here
```

### `session-start-context.py`
Reads `SOUL.md`, `USER.md`, `MEMORY.md`, and today's `daily/YYYY-MM-DD.md` → prints them to stdout so Claude sees them at conversation start.

```python
import sys, os
from pathlib import Path
from datetime import date

VAULT = Path("Elizabeth-Brain/Memory")
files = ["SOUL.md", "USER.md", "MEMORY.md", f"daily/{date.today()}.md"]
for f in files:
    p = VAULT / f
    if p.exists():
        print(f"\n--- {f} ---\n{p.read_text(encoding='utf-8')}")
```

### `session-end-flush.py`
Appends a timestamped summary of the session to today's daily log.

### `.claude/settings.json` hook registration
```json
{
  "hooks": {
    "SessionStart": [{ "command": "python .claude/hooks/session-start-context.py" }],
    "PreCompact":   [{ "command": "python .claude/hooks/pre-compact-flush.py" }],
    "SessionEnd":   [{ "command": "python .claude/hooks/session-end-flush.py" }]
  }
}
```

**Complexity:** Low-Medium  
**Dependency:** Phase 1 complete  
**Personalization:** Loads therapy goals folder + HABITS.md into every session automatically.

---

## Phase 3: Manual Daily Task Input
**What:** A simple CLI command to add tasks to today's daily log, plus a structured daily task template. No external API — entirely local.

### Files to create
```
.claude/scripts/
  add_task.py          ← CLI: python add_task.py "Call Dr. Smith re: appointment"
  daily_template.md    ← template for each day's file
```

### `add_task.py`
```python
import sys
from pathlib import Path
from datetime import date, datetime

VAULT = Path("Elizabeth-Brain/Memory")
today = VAULT / "daily" / f"{date.today()}.md"

task = " ".join(sys.argv[1:])
timestamp = datetime.now().strftime("%H:%M")

if not today.exists():
    template = (VAULT / ".." / ".." / ".claude/scripts/daily_template.md")
    today.write_text(template.read_text() if template.exists() else f"# {date.today()}\n\n## Tasks\n\n## Notes\n\n## Reflection\n")

with open(today, "a", encoding="utf-8") as f:
    f.write(f"\n- [ ] {task}  _(added {timestamp})_")

print(f"Task added to {today}")
```

### Usage
```bash
python .claude/scripts/add_task.py "Review pitch deck before 3pm"
python .claude/scripts/add_task.py "Text Sarah back about collab"
```

Or from Claude: *"Add a task: follow up with Marcus about the partnership"* → Claude runs the script.

### Daily file template (`daily_template.md`)
```markdown
# {DATE}

## Tasks
<!-- Add tasks here or run: python .claude/scripts/add_task.py "task" -->

## Google Calendar Today
<!-- Heartbeat fills this in -->

## Gmail Priority
<!-- Heartbeat fills this in -->

## Therapy Alignment
<!-- Which of today's tasks connect to your therapy goals? -->

## Notes

## Evening Reflection
```

**Complexity:** Low  
**Dependency:** Phase 1  
**Personalization:** Tasks go into daily log alongside calendar + email context so Claude can connect them.

---

## Phase 4: Therapy Session Notes + Goal Alignment
**What:** A simple paste-in workflow for therapy notes, with automatic alignment to your active goals. No API required — copy/paste into a file.

### Workflow
1. After a therapy session, paste your notes into a new file:  
   `Elizabeth-Brain/Memory/therapy/YYYY-MM-DD.md`

2. Template for each session:
```markdown
---
date: 2026-06-28
therapist: [name]
themes: [connection, boundaries, self-worth]
---

## What we discussed

## Key insights

## Action items / homework

## How this connects to my goals
```

3. Then ask Claude: *"I just added my therapy notes from today — what patterns do you see with my goals?"*

Claude reads `therapy/` + `goals/` and surfaces:
- Recurring themes across sessions
- Which active goals connect to today's insights  
- Suggested daily habit or task to act on the insight

### `goals/` structure
Each goal is its own file so Claude can reason about them individually:
```
Elizabeth-Brain/Memory/goals/
  wake-up-routine.md
  professional-growth.md
  relationship-health.md
  spiritual-practice.md
```

**Goal file format:**
```markdown
---
goal: Wake up at 8 AM consistently
started: 2026-06-01
status: active
therapy_themes: [discipline, self-care, structure]
---

## Why this matters

## Progress

## Obstacles

## What's working
```

**Complexity:** Low  
**Dependency:** Phase 1  
**Personalization:** Therapy notes are stored privately in the vault; no data ever leaves your machine to an API.

---

## Phase 5: Google Integration (Gmail + Calendar + Drive)
**What:** Connect Elizabeth's Google account so the heartbeat can read her inbox and calendar without her manually copying data in.

### One-time setup — Google OAuth (30–45 min)

You need **one** `credentials.json` file that covers Gmail, Calendar, and Drive.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) → New project: `elizabeth-brain`
2. Enable 3 APIs: **Gmail API**, **Google Calendar API**, **Google Drive API**
3. OAuth consent screen → External → add your Gmail as a test user
4. Credentials → OAuth 2.0 Client ID → Desktop app → Download as `credentials.json`
5. Save to: `.claude/secrets/credentials.json` (never commit this file)

### Files to create
```
.claude/scripts/integrations/
  google_auth.py        ← shared OAuth token handler
  gmail.py              ← read inbox, list threads, search
  gcal.py               ← list today's events, upcoming week
  gdrive.py             ← search files, read docs (optional)
  query.py              ← unified CLI: python query.py gmail list
```

### `google_auth.py`
```python
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from pathlib import Path
import pickle

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]
TOKEN_PATH = Path(".claude/secrets/token.pickle")
CREDS_PATH = Path(".claude/secrets/credentials.json")

def get_credentials():
    creds = None
    if TOKEN_PATH.exists():
        creds = pickle.loads(TOKEN_PATH.read_bytes())
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_PATH.write_bytes(pickle.dumps(creds))
    return creds
```

### `gmail.py` — key functions
- `list_unread(max=20)` → returns sender, subject, snippet, date
- `search(query)` → e.g., `"from:important-person@gmail.com"`
- `get_thread(thread_id)` → full thread for drafting replies

### `gcal.py` — key functions
- `get_today_events()` → list of events with time, title, location
- `get_week_events()` → next 7 days
- `get_upcoming_deadlines()` → events with "deadline" or "due" in title

### Install dependencies
```
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

**Complexity:** Medium  
**Dependency:** Phases 1–2  
**Rate limits:** Gmail 250 quota units/sec; Calendar 1M queries/day — no concern for personal use.

---

## Phase 6: Proactive Heartbeat (Morning Briefing + Accountability)
**What:** A script that runs every morning and optionally every evening. It reads your calendar + Gmail, checks habits, and either notifies you or drafts replies for your review.

### Files to create
```
.claude/scripts/
  heartbeat.py           ← main orchestrator
  notify.py              ← Windows Toast notification
data/state/
  heartbeat-state.json   ← tracks what was already seen
```

### Morning heartbeat (8:00 AM)
1. Reads today's Google Calendar events
2. Reads top 10 unread Gmail threads
3. Checks HABITS.md for unchecked pillars
4. Reads today's daily log tasks (your manually added ones)
5. Passes all of this to Claude Agent SDK
6. Claude generates:
   - **Morning briefing**: 3–5 bullet summary of the day
   - **Priority inbox items**: which emails need a reply today
   - **Draft replies**: saved to `Elizabeth-Brain/Memory/drafts/active/` for your review
   - **Habit nudge**: which pillars are unchecked and a concrete suggestion

### Evening heartbeat (8:00 PM)
1. Checks which tasks from today's log are unchecked `- [ ]`
2. Checks which habits are unchecked
3. Sends a gentle nudge notification
4. Optionally asks Claude to write your evening reflection

### Draft reply format
`Elizabeth-Brain/Memory/drafts/active/2026-06-28_gmail_sarah-partnership.md`
```markdown
---
type: gmail
status: active
recipient: sarah@example.com
subject: Re: Partnership collab
created: 2026-06-28T08:05:00
---

## Original Message
> Hey Elizabeth! Would love to explore the collab we talked about...

## Draft Reply
Hi Sarah,

Thanks so much for reaching out! I've been thinking about our conversation too...
```

You review the draft, copy the text, paste and send manually (your security boundary: never auto-send).

### Run on schedule (Windows Task Scheduler)
```
Program: python
Arguments: C:\create-second-brain-prd\.claude\scripts\heartbeat.py --mode morning
Trigger: Daily at 8:00 AM

Program: python  
Arguments: C:\create-second-brain-prd\.claude\scripts\heartbeat.py --mode evening
Trigger: Daily at 8:00 PM
```

**Complexity:** High  
**Dependency:** Phases 1–5  
**Personalization:** Morning briefing aligns with your 8 AM wake-up goal. Evening check-in supports your 9–10 PM wind-down goal.

---

## Phase 7: Memory Search (Hybrid RAG)
**What:** Full-text + semantic search across all your vault files — therapy notes, meeting notes, goals, daily logs.

### When you need this
Build this once your vault has 30+ files. Until then, Claude can read files directly.

### Files to create
```
.claude/scripts/
  embeddings.py       ← FastEmbed ONNX wrapper
  memory_index.py     ← build/update the index
  memory_search.py    ← hybrid search CLI
  db.py               ← SQLite abstraction
data/
  memory.db           ← SQLite + sqlite-vec + FTS5
```

### Install
```
pip install fastembed sqlite-vec
```

### Usage (once built)
```bash
python .claude/scripts/memory_search.py "what did my therapist say about boundaries"
python .claude/scripts/memory_search.py "follow up tasks from June"
```

**Complexity:** Medium  
**Dependency:** Phases 1–4  
**Personalization:** Particularly useful for searching across therapy notes when Claude asks "what patterns do we see?"

---

## Phase 8: Security Hardening
**What:** Guards based on your stated boundaries.

### Your security rules (from requirements)
| Boundary | Implementation |
|---|---|
| Never send emails | `gmail.py` is read-only only; no send function |
| Never post to social media | No social API connected |
| Never modify files outside vault | Guardrail: check all write paths against `Elizabeth-Brain/Memory/` |
| Never access financial data | No Plaid integration (deferred per your choice) |
| Never delete anything | All draft lifecycle moves files, never `os.remove()` |

### Files to create
```
.claude/scripts/
  sanitize.py    ← strip prompt injection from email/calendar content
  guardrails.py  ← pre-check before any write operation
```

**Complexity:** Medium  
**Dependency:** Phases 5–6

---

## Phase 9: Deployment (Windows Local)
**What:** Set up Windows Task Scheduler for the heartbeat, and ensure everything runs on startup.

### Task Scheduler entries
| Task | Schedule | Command |
|---|---|---|
| Morning Heartbeat | Daily 8:00 AM | `python heartbeat.py --mode morning` |
| Evening Heartbeat | Daily 8:00 PM | `python heartbeat.py --mode evening` |
| Daily Reflection | Daily 8:30 AM | `python memory_reflect.py` |
| Memory Re-index | Daily 9:00 AM | `python memory_index.py` |

### `.env.example` (already exists — fill in)
```
GOOGLE_CREDENTIALS_PATH=.claude/secrets/credentials.json
ANTHROPIC_API_KEY=sk-ant-...
VAULT_PATH=Elizabeth-Brain/Memory
```

**Complexity:** Low  
**Dependency:** All prior phases

---

## Recommended Build Order

```
Phase 1 ✓ (done)
    ↓
Phase 2 (hooks) → Phase 3 (manual tasks)  ← do these together, ~2 hrs
    ↓
Phase 4 (therapy notes) ← 30 min, no API needed
    ↓
Phase 5 (Google OAuth) ← 45 min one-time setup
    ↓
Phase 6 (heartbeat) ← biggest build, ~4 hrs
    ↓
Phase 7 (RAG search) ← build when vault is full enough
    ↓
Phase 8 + 9 (security + deploy) ← last step
```

---

## What You DON'T Need

- Slack API keys (skip Phase 7 chat interface)
- GitHub token (not needed for your top tasks)
- Canvas API (deferred — no school right now)
- Plaid (deferred — finance tracking)
- LinkedIn API (not available; filter manually or paste into vault)

**Only external API key you need:** Google OAuth `credentials.json` — one file, covers Gmail + Calendar + Drive.

---

*This PRD was generated from your requirements. Revisit and update as your system evolves.*
