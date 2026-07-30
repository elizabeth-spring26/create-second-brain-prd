#!/usr/bin/env node
/**
 * PreCompact hook — save notable context to the daily log before auto-compaction.
 * Scans the last 30 transcript messages for signal words and appends to today's log.
 */
const fs = require("fs");
const path = require("path");

const VAULT = path.resolve(__dirname, "..", "..", "Elizabeth-Brain", "Memory");

const SIGNAL_WORDS = [
  "decided", "decision", "action item", "follow up", "follow-up",
  "remember", "important", "committed", "goal", "plan", "lesson",
  "deadline", "due", "next step", "todo", "will do",
];

function extractNotable(transcriptPath) {
  const items = [];
  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean);
  } catch {
    return items;
  }

  const recent = lines.slice(-30);
  for (const raw of recent) {
    let msg;
    try { msg = JSON.parse(raw); } catch { continue; }

    const role = msg.role || "";
    let content = msg.content || "";
    if (Array.isArray(content)) {
      content = content
        .filter((c) => c && c.type === "text")
        .map((c) => c.text || "")
        .join(" ");
    }
    if (typeof content !== "string") continue;

    const lower = content.toLowerCase();
    if (!SIGNAL_WORDS.some((kw) => lower.includes(kw))) continue;

    for (const sent of content.split(".")) {
      if (SIGNAL_WORDS.some((kw) => sent.toLowerCase().includes(kw))) {
        const line = sent.trim();
        if (line.length > 20) items.push(`- [${role}] ${line}`);
      }
    }
    if (items.length >= 10) break;
  }
  return items.slice(0, 10);
}

async function main() {
  let hookInput = {};
  try {
    const raw = fs.readFileSync(0, "utf8");
    hookInput = JSON.parse(raw);
  } catch {}

  const transcriptPath = hookInput.transcript_path || "";
  if (!transcriptPath) process.exit(0);

  const items = extractNotable(transcriptPath);

  const today = new Date().toISOString().split("T")[0];
  const dailyLog = path.join(VAULT, "daily", `${today}.md`);
  fs.mkdirSync(path.dirname(dailyLog), { recursive: true });

  const now = new Date().toTimeString().slice(0, 5);
  const body = items.length > 0 ? items.join("\n") : "_(no notable items detected)_";
  const entry = `\n\n### Pre-Compact Save — ${now}\n\n${body}\n`;

  fs.appendFileSync(dailyLog, entry, "utf8");
}

main();
