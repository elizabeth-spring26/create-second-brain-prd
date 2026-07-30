# USER — Profile, Accounts & Integration Config

## Identity

- **Name:** Elizabeth Tran
- **Role:** Founder / Student
- **Timezone:** America/New_York (EST)
- **Email:** tranelizabeth0201@gmail.com

## Daily Schedule Targets

- **Wake:** 8:00 AM
- **Work end:** 9:00–10:00 PM
- **Evening reflection:** ~9:00 PM

## Accounts & Integrations

| Service                | Account                               | Status           |
| ---------------------- | ------------------------------------- | ---------------- |
| Gmail                  | tranelizabeth0201@gmail.com           | Active           |
| Google Calendar        | tranelizabeth0201@gmail.com (primary) | Active           |
| Google Drive           | tranelizabeth0201@gmail.com           | Active           |
| Slack                  | —                                     | Active           |
| Notion                 | —                                     | Active           |
| GitHub                 | —                                     | Active           |
| Plaid                  | —                                     | Pending setup    |
| LinkedIn               | Manual workflow                       | Active           |
| Unipile (LinkedIn API) | —                                     | Optional upgrade |

## Integration Config

### Google (Calendar + Gmail + Drive)

- Auth: OAuth2 via `google-auth-oauthlib`
- Credentials file: `C:\create-second-brain-prd\.secrets\credentials.json`
- Token file: `C:\create-second-brain-prd\.secrets\token.json` (auto-created after first auth)
- OAuth consent screen: Testing mode — test user: tranelizabeth0201@gmail.com
- Calendar scope: `calendar.readonly`
- Gmail scope: `gmail.modify` (read + draft; NO `gmail.send`)

### Notion

- Auth: Bearer token (Settings → Connections → Develop integrations)
- API version: 2022-06-28
- Token: stored in `.env` as `NOTION_TOKEN`
- Note: each database must be manually shared with the integration in Notion UI

### Plaid

- Environment: sandbox (dev) → production (live accounts)
- Access token: stored in `.env` as `PLAID_ACCESS_TOKEN`
- Setup: one-time Flask Link flow at localhost:5000
- Scope: READ-ONLY — no write, no payment, no transfer APIs

### Slack

- App token: `SLACK_APP_TOKEN` (xapp-...) — Socket Mode
- Bot token: `SLACK_BOT_TOKEN` (xoxb-...) — Web API
- Bot scopes: `chat:write`, `im:history`, `im:read`

### LinkedIn

- Phase 1: Manual workflow — paste messages into Claude for drafting
- Upgrade path: Unipile API (~$29/mo) when workflow is validated

### Telegram (reminders + two-way chat)

- Switched from Twilio SMS to Telegram — Twilio required geo/A2P messaging config that wasn't enabled on the account and inbound webhooks never fired; Telegram's Bot API needs no carrier registration and works via long-polling (no public URL required at all, even in production)
- Bot token: `TELEGRAM_BOT_TOKEN` in `.env` (from @BotFather)
- Elizabeth's chat id: `TELEGRAM_CHAT_ID` in `.env` — only this chat is trusted; found via `python server/telegram_get_chat_id.py`
- Transport: long-polling in a background thread (`server/telegram_bot.py`) — no webhook route, no ngrok/tunnel needed even locally
- Shared reminder/chat logic lives in `server/reminder_core.py` (Claude tool-use loop with `create_reminder` / `list_reminders` / `cancel_reminder`)
- Reminders persisted at `Elizabeth-Brain/Memory/reminders.json`; conversation context at `telegram_history.json`
- Background scheduler (`APScheduler`, in-process) checks for due reminders every 60s and messages Elizabeth
- Runs on a single gunicorn worker (`-w 1`) — required so the scheduler/poller doesn't fire duplicate messages

## Security Boundaries

- Never send emails or Slack messages autonomously
- Never post to any social platform
- Never write files outside the vault (`Elizabeth-Brain/`) or `.claude/`
- Never access financial APIs for purchases or transfers
- Never delete files (no os.remove, no API DELETE calls)
- Draft everything — Elizabeth approves before anything goes out
- Exception: **Telegram reminders** may be sent autonomously once scheduled via the `create_reminder` tool — this is the one channel Elizabeth explicitly authorized for unattended sends

## Team / Key Contacts

<!-- Add names + context here as relationships develop -->

## Notes / Preferences

- Prefers bullet lists and headers over prose in responses
- Wants Windows Toast notifications for heartbeat events
- Notion is the active project workspace; this vault is the AI-readable layer
