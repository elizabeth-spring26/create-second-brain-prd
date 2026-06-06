# HEARTBEAT — Monitor Schedule & What Each Run Checks

## Schedule

| Time | Run ID | What It Does |
|------|--------|--------------|
| 7:45 AM | `wake-nudge` | Windows Toast: "Good morning Elizabeth! Time to start your day." |
| 8:00 AM | `morning` | Full briefing + HABITS reset + draft scan + Plaid balance summary |
| 12:00 PM | `midday` | New Gmail threads needing reply, Slack mentions, overdue Notion tasks |
| 6:00 PM | `evening` | Habit pillar status + "What's unchecked?" + reflection prompt |
| 9:00 PM | `wrapup` | "Wrap-up time. What did you accomplish today?" |
| 10:00 PM | `late-nudge` | If evening reflection not done: "Don't forget to reflect before you wind down." |

## Morning Run (8:00 AM) — Full Detail

1. Reset `HABITS.md` daily checklist (clear all checkboxes)
2. Pull today's Google Calendar events
3. Pull unread Gmail threads (not promotions/social/updates)
4. Pull top 3 Notion tasks due today
5. Pull Plaid account balances
6. Scan for Gmail threads with no reply in >24h → queue draft opportunities
7. Auto-detect habit completions (Fitness via Calendar, Deep Work via GitHub/Notion, Finances via Plaid)
8. Build and display morning briefing
9. Append briefing to `daily/YYYY-MM-DD.md`

## Midday Run (12:00 PM)

1. Check for new important Gmail threads since 8 AM
2. Check Slack mentions (if integrated)
3. Flag Notion tasks that are overdue or due today and not started
4. Notify via Windows Toast if anything actionable

## Evening Run (6:00 PM)

1. Read current `HABITS.md` checklist state
2. List unchecked pillars
3. Prompt self-report for non-auto-detectable pillars (Connections, Evening Ritual)
4. Encourage completion before wind-down

## Wrap-Up (9:00 PM) + Reflection (`memory_reflect.py`)

1. Prompt: "What did you accomplish today?"
2. Read today's `daily/YYYY-MM-DD.md`
3. Promote key decisions/facts → `MEMORY.md`
4. Archive today's habit checklist → `HABITS.md` History
5. Trim `MEMORY.md` to ≤100 lines
6. Send Toast: "Today's reflection is ready. Sleep well, Elizabeth."

## Draft Management

- Heartbeat scans Gmail for threads with no reply in >24h (marked important)
- Generates draft in Elizabeth's voice using RAG on `drafts/sent/`
- Saves draft to `Elizabeth-Brain/Memory/drafts/active/YYYY-MM-DD_email_<slug>.md`
- Draft frontmatter: `type, source_id, recipient, subject, context, created, status`
- Drafts expire after 24h → moved to `drafts/expired/`
- **Never sends automatically** — Elizabeth reviews and sends manually

## State File

Heartbeat diffs against `heartbeat-state.json` — only notifies on new or changed items to avoid repeated alerts.
