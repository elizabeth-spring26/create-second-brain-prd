"use client";

import { useState, useTransition } from "react";
import { runCanvasSync, runGranolaSync } from "@/lib/actions/sync";

export function SyncButton({
  provider,
  label = "Sync now",
}: {
  provider: "canvas" | "granola";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        className="btn-secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const res = provider === "canvas" ? await runCanvasSync() : await runGranolaSync();
            // Never vague about what happened, never an apology.
            setMsg(res.ok ? "Up to date." : res.error);
          })
        }
      >
        {pending ? "Syncing…" : label}
      </button>
      {msg ? <span className="text-eyebrow text-ink-soft">{msg}</span> : null}
    </div>
  );
}
