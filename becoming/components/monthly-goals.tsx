"use client";

import { Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { addMonthlyGoalQuick, toggleMonthlyGoal } from "@/lib/actions/reflect";
import { cn } from "@/lib/utils";

export type SidebarGoal = { id: string; title: string; done: boolean };

/** Matches the cap used by the day columns and the weekly goals card. */
export const GOAL_PREVIEW = 4;

/**
 * The checklist itself, shared by the sidebar rail and the Today card so the
 * two can never drift apart. The rail is hidden below 1024px, and monthly
 * goals would otherwise be unreachable on a laptop in split screen or a phone.
 */
export function MonthlyGoalsList({
  goals,
  compact = false,
}: {
  goals: SidebarGoal[];
  /** Sidebar sizing — slightly tighter type and spacing. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  const [optimistic, setOptimistic] = useOptimistic(
    goals,
    (state: SidebarGoal[], id: string) =>
      state.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
  );

  const visible = expanded ? optimistic : optimistic.slice(0, GOAL_PREVIEW);
  const text = compact ? "text-[0.72rem]" : "text-[0.8rem]";
  const small = compact ? "text-[0.7rem]" : "text-[0.75rem]";

  function submit() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setAdding(false);
    startTransition(async () => {
      await addMonthlyGoalQuick(title);
    });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {optimistic.length === 0 && !adding ? (
        <p className={cn(small, "leading-snug text-ink-soft")}>
          Nothing set for this month yet.
        </p>
      ) : null}

      <ul className={compact ? "space-y-1.5" : "space-y-2"}>
        {visible.map((g) => (
          <li key={g.id} className="flex items-start gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={g.done}
              aria-label={g.title}
              onClick={() =>
                startTransition(async () => {
                  setOptimistic(g.id);
                  await toggleMonthlyGoal(g.id);
                })
              }
              className="mt-[2px] grid size-4 shrink-0 place-items-center rounded-[5px] border-[1.5px]"
              style={{
                borderColor: "var(--ink)",
                background: g.done ? "var(--matcha)" : "transparent",
              }}
            >
              {g.done ? (
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
                text,
                "leading-snug",
                g.done ? "text-ink-soft line-through" : "text-ink",
              )}
            >
              {g.title}
            </span>
          </li>
        ))}
      </ul>

      {optimistic.length > GOAL_PREVIEW && !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className={cn(small, "text-ink-soft transition-colors hover:text-ink")}
        >
          {optimistic.length - GOAL_PREVIEW} more
        </button>
      ) : null}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="Goal for this month"
          className={cn(
            text,
            "w-full rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1",
          )}
        />
      ) : (
        <button
          onClick={() => {
            setDraft("");
            setAdding(true);
            setExpanded(true);
          }}
          className={cn(small, "flex items-center gap-1 text-ink-soft transition-colors hover:text-ink")}
        >
          <Plus size={11} /> Add
        </button>
      )}
    </div>
  );
}
