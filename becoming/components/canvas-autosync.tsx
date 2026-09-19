"use client";

import { useEffect, useRef, useState } from "react";
import { runCanvasSync } from "@/lib/actions/sync";

/**
 * Opening /school is the moment she wants her real assignments, so the page
 * fetches them itself instead of waiting for her to notice a "Sync now"
 * button. The cron job still runs; this only covers the gap between visits.
 *
 * Renders nothing until a sync is actually in flight — a quiet line, not a
 * spinner that makes an empty page feel broken.
 */
export function CanvasAutoSync({
  lastSuccessMs,
  staleAfterMinutes = 20,
}: {
  lastSuccessMs: number | null;
  staleAfterMinutes?: number;
}) {
  const [state, setState] = useState<"idle" | "syncing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    const age = lastSuccessMs === null ? Infinity : Date.now() - lastSuccessMs;
    if (age < staleAfterMinutes * 60_000) return;

    ran.current = true;
    setState("syncing");
    runCanvasSync()
      .then((res) => {
        if (res.ok) setState("idle");
        else {
          setError(res.error);
          setState("error");
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      });
  }, [lastSuccessMs, staleAfterMinutes]);

  if (state === "idle") return null;

  return (
    <p className="mb-6 text-eyebrow text-ink-soft">
      {state === "syncing"
        ? "Checking Canvas for anything new…"
        : `Canvas didn't answer just now — ${error}`}
    </p>
  );
}
