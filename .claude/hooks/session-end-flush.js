#!/usr/bin/env node
/**
 * SessionEnd hook — write a brief session note to today's daily log on Stop.
 * Uses a temp-file marker so it writes only once per session
 * (Stop fires after every response, not just at true session exit).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const VAULT = path.resolve(__dirname, "..", "..", "Elizabeth-Brain", "Memory");

function getLastUserMessage(transcriptPath) {
  let last = "";
  try {
    const lines = fs.readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean);
    for (const raw of lines) {
      let msg;
      try { msg = JSON.parse(raw); } catch { continue; }
      if (msg.role !== "user") continue;
      let content = msg.content || "";
      if (Array.isArray(content)) {
        content = content
          .filter((c) => c && c.type === "text")
          .map((c) => c.text || "")
          .join(" ");
      }
      if (typeof content === "string" && content.trim()) {
        last = content.trim();
      }
    }
  } catch {}
  return last.slice(0, 200);
}

async function main() {
  let hookInput = {};
  try {
    const raw = fs.readFileSync(0, "utf8");
    hookInput = JSON.parse(raw);
  } catch {}

  const sessionId = hookInput.session_id || "unknown";
  const transcriptPath = hookInput.transcript_path || "";

  // Write only once per session
  const marker = path.join(os.tmpdir(), `sb_stop_${sessionId}`);
  if (fs.existsSync(marker)) process.exit(0);
  fs.writeFileSync(marker, "");

  const lastMsg = transcriptPath ? getLastUserMessage(transcriptPath) : "";
  const topic = lastMsg ? `"${lastMsg}"` : "_(unknown topic)_";

  const today = new Date().toISOString().split("T")[0];
  const dailyLog = path.join(VAULT, "daily", `${today}.md`);
  fs.mkdirSync(path.dirname(dailyLog), { recursive: true });

  const now = new Date().toTimeString().slice(0, 5);
  const entry = `\n\n### Session Closed — ${now}\n\nLast topic: ${topic}\n`;

  fs.appendFileSync(dailyLog, entry, "utf8");
}

main();
