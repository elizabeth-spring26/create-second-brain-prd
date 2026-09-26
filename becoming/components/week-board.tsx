"use client";

import { Highlighter, Plus, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Leaf } from "@/components/ghibli";
import {
  addTask,
  addWeeklyGoal,
  deleteTask,
  highlightTask,
  importTasks,
  toggleTask,
} from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

/** Marker colours, in the order the pens sit in the tray. */
export const HIGHLIGHTS = ["amber", "sakura", "matcha", "iris"] as const;
export type Highlight = (typeof HIGHLIGHTS)[number];

export type Task = {
  id: string;
  title: string;
  source: "manual" | "canvas" | "granola";
  dueDate: string | null;
  done: boolean;
  url: string | null;
  highlight: Highlight | null;
};

/** A marker stroke is a wash, not a fill — the ink has to stay readable. */
const inkWash = (c: Highlight) => `color-mix(in oklab, var(--${c}) 52%, transparent)`;

type Props = {
  days: string[];
  byDay: Record<string, Task[]>;
  undated: Task[];
  /** Due after Sunday but still inside this month. Nothing older is passed in. */
  laterThisMonth: Task[];
  /** Intentions for the week, not dated items. */
  weeklyGoals: Task[];
  todayISO: string;
};

/** Matches how many rows fit a day column before it grows. */
const GOAL_PREVIEW = 4;

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SOURCE_TOKEN: Record<Task["source"], string> = {
  manual: "iris",
  granola: "sakura",
  canvas: "matcha",
};

function TaskLine({
  t,
  onToggle,
  onDelete,
  onPaint,
  painting,
  prefix,
}: {
  t: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPaint: (id: string) => void;
  /** True while the highlighter is out: the row paints instead of opening. */
  painting: boolean;
  /** Optional leading label, e.g. the date when the day isn't implied. */
  prefix?: string;
}) {
  return (
    <li className="group flex items-start gap-2">
      {prefix ? (
        <span className="mt-[3px] font-mono text-[0.7rem] text-ink-soft">{prefix}</span>
      ) : null}
      <button
        type="button"
        role="checkbox"
        aria-checked={t.done}
        aria-label={t.title}
        onClick={() => onToggle(t.id)}
        className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors"
        style={{
          borderColor: "var(--ink)",
          background: t.done ? `var(--${SOURCE_TOKEN[t.source]})` : "transparent",
        }}
      >
        {t.done ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1.5 5.2 L4 7.5 L8.5 2.5"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>

      {painting ? (
        <button
          type="button"
          onClick={() => onPaint(t.id)}
          aria-label={`Highlight ${t.title}`}
          aria-pressed={t.highlight !== null}
          className={cn(
            "flex-1 cursor-[cell] rounded-[4px] px-1 text-left text-[0.8rem] leading-snug",
            t.done && "text-ink-soft line-through",
          )}
          style={t.highlight ? { background: inkWash(t.highlight) } : undefined}
        >
          {t.title}
        </button>
      ) : (
        <span
          className={cn(
            "flex-1 rounded-[4px] px-1 text-[0.8rem] leading-snug",
            t.done && "text-ink-soft line-through",
          )}
          style={t.highlight ? { background: inkWash(t.highlight) } : undefined}
        >
          {t.url ? (
            <a href={t.url} target="_blank" rel="noreferrer" className="hover:underline">
              {t.title}
            </a>
          ) : (
            t.title
          )}
        </span>
      )}

      <button
        type="button"
        aria-label={`Delete ${t.title}`}
        onClick={() => onDelete(t.id)}
        className="mt-[2px] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X size={12} className="text-ink-soft" />
      </button>
    </li>
  );
}

export function WeekBoard({
  days,
  byDay,
  undated,
  laterThisMonth,
  weeklyGoals,
  todayISO,
}: Props) {
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  /** Which pen is uncapped. Null means the highlighter is away. */
  const [pen, setPen] = useState<Highlight | null>(null);

  const all = [
    ...Object.values(byDay).flat(),
    ...undated,
    ...laterThisMonth,
    ...weeklyGoals,
  ];

  type Edit =
    | { kind: "toggle"; id: string }
    | { kind: "paint"; id: string; color: Highlight };

  const [optimistic, setOptimistic] = useOptimistic(all, (state: Task[], e: Edit) =>
    state.map((t) => {
      if (t.id !== e.id) return t;
      if (e.kind === "toggle") return { ...t, done: !t.done };
      return { ...t, highlight: t.highlight === e.color ? null : e.color };
    }),
  );
  const doneOf = (id: string) => optimistic.find((t) => t.id === id)?.done ?? false;
  const paintOf = (id: string) =>
    optimistic.find((t) => t.id === id)?.highlight ?? null;

  function onToggle(id: string) {
    startTransition(async () => {
      setOptimistic({ kind: "toggle", id });
      await toggleTask(id);
    });
  }

  function onPaint(id: string) {
    if (!pen) return;
    startTransition(async () => {
      setOptimistic({ kind: "paint", id, color: pen });
      await highlightTask(id, pen);
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteTask(id);
    });
  }
  function submit(day: string | null) {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setAdding(null);
    startTransition(async () => {
      await addTask({ title, dueDate: day });
    });
  }

  function submitGoal() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setAdding(null);
    startTransition(async () => {
      await addWeeklyGoal({ title });
    });
  }

  const withState = (t: Task): Task => ({
    ...t,
    done: doneOf(t.id),
    highlight: paintOf(t.id),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Monday → Sunday</p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Highlighter — uncap a pen, then tap any task to mark it as one of
              the few that actually matter today. Same pen again wipes it. */}
          <button
            type="button"
            aria-pressed={pen !== null}
            aria-label={pen ? "Put the highlighter away" : "Pick up the highlighter"}
            onClick={() => setPen(pen ? null : HIGHLIGHTS[0])}
            className="btn-cel flex items-center gap-1.5 text-[0.75rem]"
            style={{
              background: pen ? inkWash(pen) : "var(--card)",
            }}
          >
            <Highlighter size={13} />
            {pen ? "Done" : "Highlight"}
          </button>

          {pen ? (
            <div
              role="radiogroup"
              aria-label="Highlighter colour"
              className="flex items-center gap-1.5"
            >
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={pen === c}
                  aria-label={c}
                  onClick={() => setPen(c)}
                  className={cn(
                    "size-5 rounded-full border-[1.5px] border-ink transition-transform",
                    pen === c && "scale-125",
                  )}
                  style={{ background: `var(--${c})` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <button
          className="btn-cel text-[0.75rem]"
          onClick={() =>
            startTransition(async () => {
              setImporting("Pulling…");
              const res = await importTasks();
              setImporting(
                res.ok
                  ? res.imported > 0
                    ? `Added ${res.imported}.`
                    : "Nothing new."
                  : "Couldn't import.",
              );
              setTimeout(() => setImporting(null), 2500);
            })
          }
        >
          {importing ?? "Pull from Granola"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((iso, i) => {
          const isToday = iso === todayISO;
          const list = (byDay[iso] ?? []).map(withState);
          return (
            <div
              key={iso}
              className={cn("card-cel flex min-h-[128px] flex-col", isToday && "day-today")}
            >
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-display text-[0.95rem] font-bold">{DOW[i]}</span>
                <span className="font-mono text-[0.7rem] text-ink-soft">
                  {iso.slice(8)}
                </span>
              </div>

              <ul className="flex-1 space-y-2">
                {list.map((t) => (
                  <TaskLine
                  key={t.id}
                  t={t}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onPaint={onPaint}
                  painting={pen !== null}
                />
                ))}
              </ul>

              {adding === iso ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => submit(iso)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit(iso);
                    if (e.key === "Escape") {
                      setDraft("");
                      setAdding(null);
                    }
                  }}
                  placeholder="What needs doing?"
                  className="mt-2 w-full rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-[0.8rem]"
                />
              ) : (
                <button
                  onClick={() => {
                    setDraft("");
                    setAdding(iso);
                  }}
                  aria-label={`Add a task on ${DOW[i]}`}
                  className="mt-2 flex items-center gap-1 text-[0.7rem] text-ink-soft transition-colors hover:text-ink"
                >
                  <Plus size={11} /> Add
                </button>
              )}
            </div>
          );
        })}

        {/* Goals for the week — same card, same checkbox, marked as intent
            rather than a dated to-do by the leaf and the meadow tint. */}
        <div
          className="card-cel flex min-h-[128px] flex-col"
          style={{ background: "color-mix(in oklab, var(--matcha) 12%, var(--card))" }}
        >
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 font-display text-[0.95rem] font-bold">
              <Leaf size={12} />
              Goals
            </span>
            <span className="font-mono text-[0.7rem] text-ink-soft">
              {weeklyGoals.filter((g) => doneOf(g.id)).length}/{weeklyGoals.length}
            </span>
          </div>

          <ul className="flex-1 space-y-2">
            {(goalsExpanded ? weeklyGoals : weeklyGoals.slice(0, GOAL_PREVIEW))
              .map(withState)
              .map((t) => (
                <TaskLine
                  key={t.id}
                  t={t}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onPaint={onPaint}
                  painting={pen !== null}
                />
              ))}
          </ul>

          {weeklyGoals.length > GOAL_PREVIEW && !goalsExpanded ? (
            <button
              onClick={() => setGoalsExpanded(true)}
              className="mt-2 text-left text-[0.7rem] text-ink-soft transition-colors hover:text-ink"
            >
              {weeklyGoals.length - GOAL_PREVIEW} more
            </button>
          ) : null}

          {adding === "goal" ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitGoal}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitGoal();
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(null);
                }
              }}
              placeholder="What matters this week?"
              className="mt-2 w-full rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-[0.8rem]"
            />
          ) : (
            <button
              onClick={() => {
                setDraft("");
                setAdding("goal");
                setGoalsExpanded(true);
              }}
              aria-label="Add a weekly goal"
              className="mt-2 flex items-center gap-1 text-[0.7rem] text-ink-soft transition-colors hover:text-ink"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>

        {/* Belongs to the week, but not to any particular day. */}
        <div className="card-cel flex min-h-[128px] flex-col">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-display text-[0.95rem] font-bold">This week</span>
            <span className="cel-pill" style={{ background: "var(--sakura)" }}>
              no day
            </span>
          </div>
          <ul className="flex-1 space-y-2">
            {undated.map(withState).map((t) => (
              <TaskLine
                key={t.id}
                t={t}
                onToggle={onToggle}
                onDelete={onDelete}
                onPaint={onPaint}
                painting={pen !== null}
              />
            ))}
          </ul>
          {adding === "none" ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => submit(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit(null);
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(null);
                }
              }}
              placeholder="What needs doing?"
              className="mt-2 w-full rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-[0.8rem]"
            />
          ) : (
            <button
              onClick={() => {
                setDraft("");
                setAdding("none");
              }}
              className="mt-2 flex items-center gap-1 text-[0.7rem] text-ink-soft transition-colors hover:text-ink"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Still this month, just not this week. */}
      {laterThisMonth.length > 0 ? (
        <div className="card-cel mt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-display text-[0.95rem] font-bold">Later this month</span>
            <span className="font-mono text-[0.7rem] text-ink-soft">
              {laterThisMonth.length}
            </span>
          </div>
          <ul className="space-y-2">
            {laterThisMonth.map(withState).map((t) => (
              <TaskLine
                key={t.id}
                t={t}
                onToggle={onToggle}
                onDelete={onDelete}
                onPaint={onPaint}
                painting={pen !== null}
                prefix={t.dueDate?.slice(5)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4">
        {(["manual", "granola", "canvas"] as const).map((s) => (
          <span key={s} className="flex items-center gap-2 text-[0.7rem] text-ink-soft">
            <span
              className="size-2.5 rounded-full border-[1.5px] border-ink"
              style={{ background: `var(--${SOURCE_TOKEN[s]})` }}
            />
            {s === "manual" ? "Added by you" : s === "granola" ? "From a meeting" : "Canvas"}
          </span>
        ))}
      </div>
    </div>
  );
}
