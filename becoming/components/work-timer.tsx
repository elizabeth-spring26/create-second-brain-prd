"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { logSession } from "@/lib/actions/work";

type Engagement = { id: string; name: string };

/**
 * Start/stop timer plus manual entry. The timer holds a start instant and
 * derives elapsed on each tick, so it stays correct if the tab sleeps —
 * incrementing a counter would silently under-count.
 */
export function WorkTimer({ engagements }: { engagements: Engagement[] }) {
  const [, startTransition] = useTransition();
  const [engagementId, setEngagementId] = useState(engagements[0]?.id ?? "");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedAt === null) {
      if (tick.current) clearInterval(tick.current);
      return;
    }
    tick.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [startedAt]);

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  function save(minutes: number) {
    if (!engagementId || minutes < 1) return;
    startTransition(async () => {
      const res = await logSession({
        engagementId,
        minutes,
        description: description || null,
        isBillable: billable,
        sessionDate: new Date().toISOString().slice(0, 10),
      });
      setMsg(res.ok ? `Logged ${minutes} min.` : res.error);
      if (res.ok) {
        setDescription("");
        setManualMinutes("");
      }
    });
  }

  if (engagements.length === 0) {
    return (
      <p className="text-caption text-ink-soft">
        Add an engagement first and the timer has something to log against.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Engagement</span>
          <select
            value={engagementId}
            onChange={(e) => setEngagementId(e.target.value)}
            className="rounded-control border border-haze bg-transparent px-3 py-2 text-caption"
          >
            {engagements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>

        <p className="font-mono text-title leading-none tabular-nums">
          {hh}:{mm}:{ss}
        </p>

        {startedAt === null ? (
          <button
            className="btn-primary"
            onClick={() => {
              setElapsed(0);
              setStartedAt(Date.now());
            }}
          >
            Start
          </button>
        ) : (
          <button
            className="btn-secondary"
            onClick={() => {
              const minutes = Math.max(1, Math.round(elapsed / 60));
              setStartedAt(null);
              save(minutes);
            }}
          >
            Stop and log
          </button>
        )}
      </div>

      <label className="block">
        <span className="eyebrow mb-2 block">What you did</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Drafted the sponsor one-pager"
          className="w-full rounded-control border border-haze bg-transparent px-3 py-2 text-body"
        />
      </label>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-caption">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          Billable
        </label>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Or log minutes</span>
          <input
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="45"
            className="w-24 rounded-control border border-haze bg-transparent px-3 py-2 text-center font-mono text-caption"
          />
        </label>
        <button
          className="btn-secondary"
          onClick={() => save(Number(manualMinutes))}
          disabled={!manualMinutes}
        >
          Log
        </button>
        {msg ? <span className="text-eyebrow text-ink-soft">{msg}</span> : null}
      </div>
    </div>
  );
}
