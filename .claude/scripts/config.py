"""
Central config loader — all scripts import from here.
Reads .env for API tokens and .secrets/ for OAuth credential files.
Never hardcode credentials anywhere else.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent.parent  # C:\create-second-brain-prd
SECRETS_DIR = ROOT / ".secrets"
ENV_FILE = ROOT / ".env"

load_dotenv(ENV_FILE)


def _require(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise EnvironmentError(
            f"Missing required env var: {key}\n"
            f"Add it to {ENV_FILE}  (copy .env.example as a starting point)"
        )
    return val


# ── Anthropic ─────────────────────────────────────────────────────────────────
def get_anthropic_key() -> str:
    return _require("ANTHROPIC_API_KEY")


# ── GitHub ─────────────────────────────────────────────────────────────────────
def get_github_token() -> str:
    return _require("GITHUB_TOKEN")

def get_github_repo() -> str:
    return _require("GITHUB_REPO")


# ── Google OAuth ──────────────────────────────────────────────────────────────
GOOGLE_CREDENTIALS_FILE = SECRETS_DIR / "credentials.json"
GOOGLE_TOKEN_FILE = SECRETS_DIR / "token.json"

GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
GOOGLE_GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
GOOGLE_SCOPES = GOOGLE_CALENDAR_SCOPES + GOOGLE_GMAIL_SCOPES

def require_google_credentials():
    if not GOOGLE_CREDENTIALS_FILE.exists():
        raise FileNotFoundError(
            f"credentials.json not found at {GOOGLE_CREDENTIALS_FILE}\n"
            "Download it from Google Cloud Console → APIs & Services → Credentials"
        )
    return GOOGLE_CREDENTIALS_FILE


# ── Slack ─────────────────────────────────────────────────────────────────────
def get_slack_app_token() -> str:
    return _require("SLACK_APP_TOKEN")

def get_slack_bot_token() -> str:
    return _require("SLACK_BOT_TOKEN")

def get_slack_channel() -> str:
    return os.getenv("SLACK_NOTIFICATION_CHANNEL", "#general")


# ── Notion ────────────────────────────────────────────────────────────────────
def get_notion_token() -> str:
    return _require("NOTION_TOKEN")


# ── Plaid (Phase 5) ───────────────────────────────────────────────────────────
def get_plaid_credentials() -> dict:
    return {
        "access_token": _require("PLAID_ACCESS_TOKEN"),
        "client_id": _require("PLAID_CLIENT_ID"),
        "secret": _require("PLAID_SECRET"),
    }
