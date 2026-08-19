"use client";

import { useState, useTransition } from "react";
import { saveWeeklyReview } from "@/lib/actions/reflect";
import { cn } from "@/lib/utils";

type Props = {
  weekStart: string;
  initial: {
    whatWentWrong: string | null;
    whatDrainedMe: string | null;
    whatILearned: string | null;
    wins: string[];
    oneChangeNextWeek: string | null;
    weekRating: number | null;
  } | null;
  /** Last week's "one change", surfaced so it can actually be answered for. */
  lastChange: string | null;
};

const PROMPTS = [
  { key: "whatWentWrong", text: "What went wrong this week? No softening. Be honest." },
  { key: "whatDrainedMe", text: "What drained your energy most?" },
  { key: "whatILearned", text: "What did you learn from it?" },
] as const;

export function WeeklyReviewForm({ weekStart, initial, lastChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const [values, setValues] = useState({
    whatWentWrong: initial?.whatWentWrong ?? "",
    whatDrainedMe: initial?.whatDrainedMe ?? "",
    whatILearned: initial?.whatILearned ?? "",
  });
  const [wins, setWins] = useState<string[]>(
    initial?.wins?.length ? [...initial.wins, "", ""].slice(0, 3) : ["", "", ""],
  );
  const [oneChange, setOneChange] = useState(initial?.oneChangeNextWeek ?? "");
  const [rating, setRating] = useState<number | null>(initial?.weekRating ?? null);
  const [didLast, setDidLast] = useState<boolean | null>(null);

  function submit() {
    startTransition(async () => {
      const res = await saveWeeklyReview({
        weekStart,
        ...values,
        wins: wins.filter((w) => w.trim()),
        oneChangeNextWeek: oneChange || null,
        weekRating: rating,
        didLastChange: didLast,
      });
      if (res.ok) setDone(true);
    });
  }

  return (
    <div className="space-y-12">
      {/* The callback. The most valuable thing on this page. */}
      {lastChange ? (
        <div className="card-surface">
          <p className="eyebrow mb-3">Last week you said you&rsquo;d</p>
          <p className="font-reflective text-heading italic">{lastChange}</p>
          <p className="mt-5 text-caption text-ink-soft">Did you?</p>
          <div className="mt-3 flex gap-2">
            {[
              { label: "I did", v: true },
              { label: "Not really", v: false },
            ].map((o) => (
              <button
                key={o.label}
                onClick={() => setDidLast(o.v)}
                className={cn(
                  "rounded-control px-4 py-2 text-caption transition-colors",
                  didLast === o.v ? "text-ink" : "text-ink-soft hover:text-ink",
                )}
                style={
                  didLast === o.v
                    ? { background: "var(--haze)" }
                    : { border: "1px solid var(--haze)" }
                }
              >
                {o.label}
              </button>
            ))}
          </div>
          {didLast === false ? (
            <p className="mt-4 text-caption text-ink-soft">
              Worth asking what got in the way — that answer usually belongs in the first
              prompt below.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Journal prompts — no visible borders, like writing on paper. */}
      {PROMPTS.map((p) => (
        <div key={p.key}>
          <p className="mb-4 font-reflective text-heading italic">{p.text}</p>
          <textarea
            value={values[p.key]}
            onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
            rows={4}
            className="w-full resize-none border-0 bg-transparent p-0 text-body leading-relaxed outline-none placeholder:text-ink-soft focus-visible:outline-none"
            placeholder="Start writing…"
          />
          <div className="h-px w-full" style={{ background: "var(--haze)" }} />
        </div>
      ))}

      <div>
        <p className="mb-4 font-reflective text-heading italic">
          Three wins — however small.
        </p>
        <div className="space-y-3">
          {wins.map((w, i) => (
            <div key={i}>
              <input
                value={w}
                onChange={(e) =>
                  setWins((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
                placeholder={`Win ${i + 1}`}
                className="w-full border-0 bg-transparent p-0 text-body outline-none placeholder:text-ink-soft"
              />
              <div className="mt-2 h-px w-full" style={{ background: "var(--haze)" }} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-4 font-reflective text-heading italic">
          One thing you&rsquo;ll do differently next week.
        </p>
        <textarea
          value={oneChange}
          onChange={(e) => setOneChange(e.target.value)}
          rows={2}
          className="w-full resize-none border-0 bg-transparent p-0 text-body outline-none placeholder:text-ink-soft"
          placeholder="One thing. Specific enough to answer for next Sunday."
        />
        <div className="h-px w-full" style={{ background: "var(--haze)" }} />
      </div>

      <div>
        <p className="eyebrow mb-3">Rate the week</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Week rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              className="size-10 rounded-full border font-mono text-caption transition-all"
              style={{
                background: rating !== null && n <= rating ? "var(--iris)" : "transparent",
                borderColor: rating !== null && n <= rating ? "var(--iris)" : "var(--haze)",
                color: rating !== null && n <= rating ? "var(--paper)" : "var(--ink-soft)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Close out the week"}
        </button>
        {done ? <span className="text-eyebrow text-ink-soft">Saved.</span> : null}
      </div>
    </div>
  );
}
