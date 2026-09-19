"use client";

import { useState, useTransition } from "react";
import { setCourseHidden } from "@/lib/actions/settings";

export type CourseRow = {
  id: string;
  name: string;
  term: string | null;
  isHidden: boolean;
  count: number;
};

/**
 * There used to be a global "show Canvas" switch in front of this list. It
 * made every new term start invisible, so the only control left is per-course:
 * uncheck the ones whose work you don't want in your week.
 */
export function CanvasControls({ courses }: { courses: CourseRow[] }) {
  const [, startTransition] = useTransition();
  const [hidden, setHidden] = useState(
    Object.fromEntries(courses.map((c) => [c.id, c.isHidden])),
  );

  if (courses.length === 0) {
    return (
      <p className="text-caption text-ink-soft">
        No courses synced yet. Open School and your active Canvas courses pull
        themselves in.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-eyebrow text-ink-soft">
        Checked courses show up on School and in your week. Assignments sync on
        their own — this only decides what you look at.
      </p>
      <div className="space-y-2">
        {courses.map((c) => (
          <label key={c.id} className="flex items-start gap-3 text-caption">
            <input
              type="checkbox"
              checked={!hidden[c.id]}
              onChange={(e) => {
                const v = !e.target.checked;
                setHidden((p) => ({ ...p, [c.id]: v }));
                startTransition(async () => {
                  await setCourseHidden(c.id, v);
                });
              }}
            />
            <span className={hidden[c.id] ? "text-ink-soft line-through" : undefined}>
              {c.name}
              <span className="ml-2 font-mono text-eyebrow text-ink-soft">
                {c.term ?? "no term"} · {c.count}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
