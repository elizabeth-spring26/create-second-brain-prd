"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  Home,
  LineChart,
  Plus,
  RefreshCcw,
  Settings,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { addMonthlyGoalQuick, toggleMonthlyGoal } from "@/lib/actions/reflect";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/habits", label: "Habits", icon: RefreshCcw },
  { href: "/reflect", label: "Reflect", icon: Sparkles },
  { href: "/school", label: "School", icon: GraduationCap },
  { href: "/career", label: "Career", icon: BriefcaseBusiness },
  { href: "/work", label: "Work", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export type SidebarGoal = { id: string; title: string; done: boolean };

const GOAL_PREVIEW = 4;

/**
 * Monthly goals live in the rail as an expandable checklist rather than a
 * route — they're a reference you glance at, not a place you go. Writes to the
 * same monthly_goals table /reflect uses, so there's one set of goals.
 */
function MonthlyGoals({ goals }: { goals: SidebarGoal[] }) {
  const [open, setOpen] = useState(false);
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
  const doneCount = optimistic.filter((g) => g.done).length;

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
    <li className="pt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-control py-2 pl-4 pr-3 text-caption transition-colors",
          open ? "text-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        <Target size={16} strokeWidth={1.75} />
        <span className="flex-1 text-left">Monthly Goals</span>
        {optimistic.length > 0 ? (
          <span className="font-mono text-[0.7rem] text-ink-soft">
            {doneCount}/{optimistic.length}
          </span>
        ) : null}
        <ChevronDown
          size={13}
          className="transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open ? (
        <div className="mt-1 space-y-2 pb-2 pl-4 pr-2">
          {optimistic.length === 0 && !adding ? (
            <p className="text-[0.7rem] leading-snug text-ink-soft">
              Nothing set for this month yet.
            </p>
          ) : null}

          <ul className="space-y-1.5">
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
                  className="mt-[2px] grid size-[14px] shrink-0 place-items-center rounded-[4px] border-[1.5px]"
                  style={{
                    borderColor: "var(--ink)",
                    background: g.done ? "var(--matcha)" : "transparent",
                  }}
                >
                  {g.done ? (
                    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
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
                    "text-[0.72rem] leading-snug",
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
              className="text-[0.7rem] text-ink-soft transition-colors hover:text-ink"
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
              className="w-full rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-[0.72rem]"
            />
          ) : (
            <button
              onClick={() => {
                setDraft("");
                setAdding(true);
                setExpanded(true);
              }}
              className="flex items-center gap-1 text-[0.7rem] text-ink-soft transition-colors hover:text-ink"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** Persistent left rail on desktop. */
export function SideRail({ monthlyGoals = [] }: { monthlyGoals?: SidebarGoal[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="sticky top-8 space-y-0.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-control py-2 pl-4 pr-3 text-caption transition-colors",
                  active ? "text-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                    style={{ background: "var(--iris)" }}
                  />
                ) : null}
                <Icon size={16} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}

        <MonthlyGoals goals={monthlyGoals} />
      </ul>
    </nav>
  );
}

/** Bottom tab bar on mobile — the six most-used routes. */
export function BottomTabs() {
  const pathname = usePathname();
  const tabs = ITEMS.filter((i) =>
    ["/", "/habits", "/reflect", "/school", "/career", "/insights"].includes(i.href),
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-haze bg-card/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-[560px] items-stretch justify-between px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.65rem] transition-colors",
                  active ? "text-ink" : "text-ink-soft",
                )}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
