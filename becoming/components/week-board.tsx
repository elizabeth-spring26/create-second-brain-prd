"use client";

import { Plus, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { addTask, deleteTask, importTasks, toggleTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

export type Task = {
  id: string;
  title: string;
  source: "manual" | "canvas" | "granola";
  dueDate: string | null;
  done: boolean;
  url: string | null;
};

type Props = {
  days: string[];
  byDay: Record<string, Task[]>;
  undated: Task[];
  /** Due after Sunday but still inside this month. Nothing older is passed in. */
  laterThisMonth: Task[];
  todayISO: string;
};

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
  prefix,
}: {
  t: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
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

      <span
        className={cn(
          "flex-1 text-[0.8rem] leading-snug",
          t.done && "text-ink-soft line-through",
        )}
      >
        {t.url ? (
          <a href={t.url} target="_blank" rel="noreferrer" className="hover:underline">
            {t.title}
          </a>
        ) : (
          t.title
        )}
      </span>

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

export function WeekBoard({ days, byDay, undated, laterThisMonth, todayISO }: Props) {
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [importing, setImporting] = useState<string | null>(null);

  const all = [...Object.values(byDay).flat(), ...undated, ...laterThisMonth];
  const [optimistic, setOptimistic] = useOptimistic(
    all,
    (state: Task[], id: string) =>
      state.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  );
  const doneOf = (id: string) => optimistic.find((t) => t.id === id)?.done ?? false;

  function onToggle(id: string) {
    startTransition(async () => {
      setOptimistic(id);
      await toggleTask(id);
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

  const withState = (t: Task): Task => ({ ...t, done: doneOf(t.id) });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Monday → Sunday</p>
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
                  <TaskLine key={t.id} t={t} onToggle={onToggle} onDelete={onDelete} />
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
              <TaskLine key={t.id} t={t} onToggle={onToggle} onDelete={onDelete} />
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
