"""
Reads and writes vault files via the GitHub API.
Falls back to local filesystem when GITHUB_TOKEN is not set (local dev).
"""
import os
import base64
import re
from datetime import date
from pathlib import Path

import requests

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO", "888lizabeth/create-second-brain-prd")
VAULT_ROOT = "Elizabeth-Brain/Memory"
BRANCH = "main"
LOCAL_VAULT = Path(__file__).parent.parent / "Elizabeth-Brain" / "Memory"


def _use_github():
    # Only use GitHub API in production — set USE_GITHUB_API=true in Railway env vars
    return bool(GITHUB_TOKEN) and os.getenv("USE_GITHUB_API", "").lower() == "true"


def _headers():
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }


def _api(path):
    return f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"


# ── Read ───────────────────────────────────────────────────────────────────────

def read_file(vault_relative_path):
    """Returns (content_str, sha) or (None, None) on failure."""
    if _use_github():
        full_path = f"{VAULT_ROOT}/{vault_relative_path}"
        r = requests.get(_api(full_path), headers=_headers(), params={"ref": BRANCH}, timeout=10)
        if r.status_code != 200:
            return None, None
        data = r.json()
        content = base64.b64decode(data["content"]).decode("utf-8")
        return content, data["sha"]
    else:
        p = LOCAL_VAULT / vault_relative_path
        if not p.exists():
            return None, None
        return p.read_text(encoding="utf-8"), "local"


def list_dir(vault_relative_path):
    """Returns sorted list of filenames in a vault directory."""
    if _use_github():
        full_path = f"{VAULT_ROOT}/{vault_relative_path}"
        r = requests.get(_api(full_path), headers=_headers(), params={"ref": BRANCH}, timeout=10)
        if r.status_code != 200:
            return []
        return sorted(f["name"] for f in r.json() if f["type"] == "file")
    else:
        p = LOCAL_VAULT / vault_relative_path
        if not p.exists():
            return []
        return sorted(f.name for f in p.iterdir() if f.is_file())


# ── Write ──────────────────────────────────────────────────────────────────────

def write_file(vault_relative_path, content, commit_message="Second brain update"):
    """Create or update a file. Returns True on success."""
    if _use_github():
        full_path = f"{VAULT_ROOT}/{vault_relative_path}"
        _, sha = read_file(vault_relative_path)
        body = {
            "message": commit_message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "branch": BRANCH,
        }
        if sha and sha != "local":
            body["sha"] = sha
        r = requests.put(_api(full_path), headers=_headers(), json=body, timeout=10)
        return r.status_code in (200, 201)
    else:
        p = LOCAL_VAULT / vault_relative_path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return True


# ── Helpers ────────────────────────────────────────────────────────────────────

def today_path():
    return f"daily/{date.today().isoformat()}.md"


def get_today_log():
    content, _ = read_file(today_path())
    return content or ""


def parse_tasks(log_content):
    """Extract tasks from a daily log. Returns list of {text, done} dicts."""
    tasks = []
    for line in log_content.splitlines():
        m = re.match(r"^- \[(x| )\] (.+?)(?:\s*_\(added.*\)_)?$", line.strip())
        if m:
            tasks.append({"text": m.group(2).strip(), "done": m.group(1) == "x"})
    return tasks


def parse_habits(habits_content):
    """Extract habits from HABITS.md. Returns list of {text, done} dicts."""
    habits = []
    for line in habits_content.splitlines():
        m = re.match(r"^- \[(x| )\] (.+)$", line.strip())
        if m:
            habits.append({"text": m.group(2).strip(), "done": m.group(1) == "x"})
    return habits


def parse_action_items(note_content):
    """Extract unchecked items from a synced Granola note's '## Action Items'
    section. Returns list of strings; stops at the next '## ' heading."""
    items = []
    in_section = False
    for line in note_content.splitlines():
        stripped = line.strip()
        if stripped.startswith("## "):
            in_section = stripped.lower().startswith("## action items")
            continue
        if in_section:
            m = re.match(r"^- \[ \] (.+)$", stripped)
            if m:
                items.append(m.group(1).strip())
    return items


def parse_note_title(note_content, fallback):
    """Pull `title:` out of a note's YAML frontmatter."""
    for line in note_content.splitlines()[:10]:
        if line.startswith("title:"):
            return line.replace("title:", "").strip()
    return fallback


def append_task(task_text):
    """Add a task to today's daily log."""
    from datetime import datetime
    log = get_today_log()
    timestamp = datetime.now().strftime("%H:%M")
    if not log:
        log = f"# {date.today().isoformat()}\n\n## Tasks\n"
    new_line = f"\n- [ ] {task_text}  _(added {timestamp})_"
    return write_file(today_path(), log + new_line, f"Add task: {task_text[:50]}")
