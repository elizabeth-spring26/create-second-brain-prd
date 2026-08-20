"use client";

import { Archive, Check, Pencil, Pin, Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { archiveHabit, createHabit, setHabitPinned, updateHabit } from "@/lib/actions/habits";
import { toggleHabit } from "@/lib/actions/daily";
import { cn } from "@/lib/utils";

export type EditableHabit = {
  id: string;
  name: string;
  emoji: string | null;
  direction: "build" | "break";
  pinned: boolean;
  loggedDates: string[];
  current: number;
  best: number;
  pct: number;
};

/**
 * Every day in the grid is clickable, so a missed Tuesday can be filled in on
 * Wednesday. Habits are renameable and archivable in place — this page used to
 * be read-only, which made it useless for actually keeping habits.
 */
function Grid({
  habitId,
  direction,
  loggedDates,
  dates,
  todayISO,
}: {
  habitId: string;
  direction: "build" | "break";
  loggedDates: string[];
  dates: string[];
  todayISO: string;
}) {
  const [, startTransition] = useTransition();
  const [logged, setLogged] = useOptimistic(
    new Set(loggedDates),
    (state: Set<string>, iso: string) => {
      const next = new Set(state);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    },
  );

  const fill = direction === "break" ? "var(--sakura)" : "var(--matcha)";
  const columns: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) columns.push(dates.slice(i, i + 7));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-[3px]" style={{ minWidth: columns.length * 13 }}>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((iso) => {
              const isLogged = logged.has(iso);
              const kept = direction === "build" ? isLogged : !isLogged;
              const future = iso > todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={future}
                  aria-label={`${iso} — ${kept ? "kept" : "not kept"}`}
                  title={`${iso} · click to ${isLogged ? "undo" : "log"}`}
                  onClick={() =>
                    startTransition(async () => {
                      setLogged(iso);
                      await toggleHabit(habitId, iso);
                    })
                  }
                  className={cn(
                    "size-[10px] rounded-[4px] border transition-transform",
                    !future && "hover:scale-125",
                    future && "cursor-default opacity-40",
                  )}
                  style={{
                    background: kept ? fill : "var(--haze)",
                    borderColor: iso === todayISO ? "var(--ink)" : "transparent",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({
  h,
  dates,
  todayISO,
}: {
  h: EditableHabit;
  dates: string[];
  todayISO: string;
}) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(h.name);
  const [emoji, setEmoji] = useState(h.emoji ?? "");
  const [pinned, setPinned] = useState(h.pinned);

  function save() {
    setEditing(false);
    startTransition(async () => {
      await updateHabit(h.id, { name: name.trim() || h.name, emoji });
    });
  }

  return (
    <div className="card-cel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              aria-label="Emoji"
              className="w-12 rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-center"
            />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              aria-label="Habit name"
              className="min-w-0 flex-1 rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1"
            />
            <button onClick={save} aria-label="Save" className="btn-cel px-3 py-1">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {h.emoji ? <span className="text-heading leading-none">{h.emoji}</span> : null}
            <div>
              <p className="text-subheading">{h.name}</p>
              <p className="text-eyebrow text-ink-soft">
                {h.direction === "break" ? "Clean days counted up" : "Building"}
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              aria-label={`Rename ${h.name}`}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="eyebrow">Now</p>
            <p className="font-mono text-subheading leading-none">{h.current}d</p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Best</p>
            <p className="font-mono text-subheading leading-none">{h.best}d</p>
          </div>
          <div className="text-right">
            <p className="eyebrow">30d</p>
            <p className="font-mono text-subheading leading-none">{h.pct}%</p>
          </div>
          <button
            onClick={() => {
              const next = !pinned;
              setPinned(next);
              startTransition(async () => void (await setHabitPinned(h.id, next)));
            }}
            aria-pressed={pinned}
            aria-label={pinned ? `Unpin ${h.name} from Today` : `Pin ${h.name} to Today`}
            title={pinned ? "Showing on Today" : "Pin to Today"}
            className="transition-colors"
            style={{ color: pinned ? "var(--sakura)" : "var(--ink-soft)" }}
          >
            <Pin size={14} fill={pinned ? "var(--sakura)" : "none"} />
          </button>
          <button
            onClick={() => startTransition(async () => void (await archiveHabit(h.id)))}
            aria-label={`Archive ${h.name}`}
            className="text-ink-soft transition-colors hover:text-ink"
            title="Archive — keeps the history"
          >
            <Archive size={14} />
          </button>
        </div>
      </div>

      <Grid
        habitId={h.id}
        direction={h.direction}
        loggedDates={h.loggedDates}
        dates={dates}
        todayISO={todayISO}
      />
      <p className="mt-2 text-[0.7rem] text-ink-soft">Click any square to log that day.</p>
    </div>
  );
}

export function HabitEditor({
  build,
  brk,
  dates,
  todayISO,
}: {
  build: EditableHabit[];
  brk: EditableHabit[];
  dates: string[];
  todayISO: string;
}) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [direction, setDirection] = useState<"build" | "break">("build");

  function add() {
    if (!name.trim()) return;
    const payload = { name: name.trim(), emoji, direction };
    setName("");
    setEmoji("");
    setOpen(false);
    startTransition(async () => {
      await createHabit(payload);
    });
  }

  return (
    <div>
      <div className="mb-8 flex justify-end">
        {open ? (
          <div className="card-cel flex w-full flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Emoji</span>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🌸"
                className="w-14 rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-center"
              />
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1">
              <span className="eyebrow">Habit</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="Mindful walk"
                className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Kind</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "build" | "break")}
                className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-[7px] text-caption"
              >
                <option value="build">Building</option>
                <option value="break">Letting go of</option>
              </select>
            </label>
            <button className="btn-cel" onClick={add}>
              Add it
            </button>
            <button className="text-caption text-ink-soft" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-cel flex items-center gap-1.5" onClick={() => setOpen(true)}>
            <Plus size={14} /> New habit
          </button>
        )}
      </div>

      {build.length > 0 ? (
        <section className="mb-12">
          <p className="eyebrow mb-4">What you&rsquo;re building</p>
          <div className="space-y-4">
            {build.map((h) => (
              <Row key={h.id} h={h} dates={dates} todayISO={todayISO} />
            ))}
          </div>
        </section>
      ) : null}

      {brk.length > 0 ? (
        <section>
          <p className="eyebrow mb-4">What you&rsquo;re letting go of</p>
          <div className="space-y-4">
            {brk.map((h) => (
              <Row key={h.id} h={h} dates={dates} todayISO={todayISO} />
            ))}
          </div>
          <p className="mt-4 text-eyebrow text-ink-soft">
            These count clean days upward. A slip just ends a run — it&rsquo;s never tallied
            against you.
          </p>
        </section>
      ) : null}
    </div>
  );
}
