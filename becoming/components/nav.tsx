"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Home,
  LineChart,
  RefreshCcw,
  Settings,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

/** Persistent left rail on desktop. */
export function SideRail() {
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
