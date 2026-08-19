"use client";

import { useOptimistic, useTransition } from "react";
import { HabitRing } from "@/components/habit-ring";
import { toggleHabit } from "@/lib/actions/daily";

export type HabitItem = {
  id: string;
  name: string;
  emoji: string | null;
  direction: "build" | "break";
  logged: boolean;
};

/**
 * The ring row on /today. Optimistic so the sparkle fires on tap rather than
 * after a server round-trip — the delay is what would make it feel cheap.
 */
export function HabitRow({ habits, logDate }: { habits: HabitItem[]; logDate: string }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    habits,
    (state: HabitItem[], id: string) =>
      state.map((h) => (h.id === id ? { ...h, logged: !h.logged } : h)),
  );

  if (habits.length === 0) {
    return (
      <p className="text-caption text-ink-soft">
        No habits yet — add a few on the habits page.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-5">
      {optimistic.map((h) => (
        <HabitRing
          key={h.id}
          label={h.name}
          emoji={h.emoji ?? undefined}
          variant={h.direction}
          // A break habit reads as "kept" when it was NOT logged.
          progress={h.direction === "break" ? (h.logged ? 0 : 1) : h.logged ? 1 : 0}
          onToggle={() =>
            startTransition(async () => {
              setOptimistic(h.id);
              await toggleHabit(h.id, logDate);
            })
          }
        />
      ))}
    </div>
  );
}
