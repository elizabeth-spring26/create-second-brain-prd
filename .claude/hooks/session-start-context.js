#!/usr/bin/env node
/**
 * SessionStart hook — inject Elizabeth's memory vault into every new conversation.
 * Fires on UserPromptSubmit; uses a temp-file marker to inject only once per session.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const VAULT = path.resolve(__dirname, "..", "..", "Elizabeth-Brain", "Memory");

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function alreadyInjected(sessionId) {
  const marker = path.join(os.tmpdir(), `sb_start_${sessionId}`);
  if (fs.existsSync(marker)) return true;
  fs.writeFileSync(marker, "");
  return false;
}

async function main() {
  let hookInput = {};
  try {
    // fd 0 = stdin; works on both Windows and Unix when piped
    const raw = fs.readFileSync(0, "utf8");
    hookInput = JSON.parse(raw);
  } catch {
    // not piped or invalid JSON — proceed with empty input
  }

  const sessionId = hookInput.session_id || "unknown";

  if (alreadyInjected(sessionId)) {
    process.exit(0);
  }

  const sections = [
    ["SOUL.md",   "## SOUL — Agent Personality & Rules"],
    ["USER.md",   "## USER PROFILE"],
    ["MEMORY.md", "## ACTIVE MEMORY"],
    ["HABITS.md", "## TODAY'S HABITS"],
  ];

  const parts = [];

  for (const [fname, label] of sections) {
    const text = readSafe(path.join(VAULT, fname));
    if (text) parts.push(`${label}\n\n${text}`);
  }

  const today = new Date().toISOString().split("T")[0];
  const dailyPath = path.join(VAULT, "daily", `${today}.md`);
  const daily = readSafe(dailyPath);
  if (daily) parts.push(`## TODAY'S LOG (${today})\n\n${daily}`);

  // Load all active goals
  const goalsDir = path.join(VAULT, "goals");
  if (fs.existsSync(goalsDir)) {
    const goalFiles = fs.readdirSync(goalsDir)
      .filter(f => f.endsWith(".md") && !f.startsWith("_"))
      .sort();
    const goalTexts = goalFiles
      .map(f => readSafe(path.join(goalsDir, f)))
      .filter(Boolean)
      .join("\n\n---\n\n");
    if (goalTexts) parts.push(`## ACTIVE GOALS\n\n${goalTexts}`);
  }

  // Load most recent note from each synced Granola folder (last 1 each)
  const granolaFolders = [
    { dir: "therapy", label: "MOST RECENT THERAPY SESSION" },
    { dir: "generator", label: "MOST RECENT GENERATOR NOTE" },
  ];
  for (const { dir, label } of granolaFolders) {
    const folderPath = path.join(VAULT, dir);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath)
        .filter(f => f.match(/^\d{4}-\d{2}-\d{2}/) && f.endsWith(".md"))
        .sort()
        .slice(-1);
      for (const f of files) {
        const text = readSafe(path.join(folderPath, f));
        if (text) parts.push(`## ${label} (${f.replace(".md","")})\n\n${text}`);
      }
    }
  }

  if (parts.length === 0) {
    process.exit(0);
  }

  const context =
    "<!-- SECOND BRAIN — injected by session-start hook -->\n\n" +
    parts.join("\n\n---\n\n");

  process.stdout.write(JSON.stringify({ additionalContext: context }) + "\n");
}

main();
