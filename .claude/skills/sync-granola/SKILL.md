---
name: sync-granola
description: Sync new Granola notes from Elizabeth's tracked folders into the memory vault. Skips notes already saved. Run after adding new therapy or Generator notes in Granola.
argument-hint: [folder-name|all]
---

# Granola Sync

Pull new notes from Elizabeth's tracked Granola folders and save them to the vault. Only writes files that don't already exist — safe to run anytime.

## Tracked Folders

| Granola Folder | Folder ID | Vault Path |
|---|---|---|
| therapy | `4a837484-672f-4365-932d-8719c1ddeb8c` | `Elizabeth-Brain/Memory/therapy/` |
| generator | `78a3a1e6-0df9-4c3c-bd09-bec64878c853` | `Elizabeth-Brain/Memory/generator/` |

To add a new folder to tracking, add a row to this table.

## Workflow

**If argument is a folder name** (e.g. `/sync-granola therapy`): sync only that folder.  
**If argument is `all` or omitted**: sync all tracked folders.

For each tracked folder:

1. Call `list_meetings` with `folder_id` and `time_range: last_30_days` (use `custom` with a wide range if the user says "sync everything").

2. For each meeting returned, check whether a file already exists in the vault path:
   - File naming: `YYYY-MM-DD.md` using the meeting date
   - If a file with that date already exists → skip it, log "already saved"
   - If no file exists → it's new, fetch it

3. For each new meeting, call `get_meetings` with its ID to retrieve the full summary and private notes.

4. Write the file to the vault using this format:

```markdown
---
date: YYYY-MM-DD
title: [meeting title]
themes: [extract 3-5 keyword themes from the summary]
---

## Key Insights

[Distill the summary into 4-8 bullet points — keep what's actionable or emotionally significant, cut logistics noise]

## Private Notes

[Include verbatim if present]

## Action Items

[Extract any explicit next steps as unchecked checkboxes: - [ ] item]

## Goals Connected

[Link to any relevant goal files using [[goal-slug]] format — self-confidence, wake-up-routine, decisive-leadership, professional-growth]
```

5. After writing all files, report:
   - How many new notes were saved
   - How many were skipped (already existed)
   - List the new file names
   - If any new therapy note contains action items, ask: "Want me to add these action items to today's task list?"

## Adding a New Folder

If the user says "also sync my [folder name] Granola folder":
1. Use `list_meeting_folders` to find the folder ID
2. Add it to the tracked folders table in this SKILL.md
3. Create the vault path `Elizabeth-Brain/Memory/[folder-name]/`
4. Run the sync for that folder immediately
