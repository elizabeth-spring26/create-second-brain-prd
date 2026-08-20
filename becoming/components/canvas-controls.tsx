"use client";

import { useState, useTransition } from "react";
import { setCourseHidden, setShowCanvas } from "@/lib/actions/settings";

export type CourseRow = {
  id: string;
  name: string;
  term: string | null;
  isHidden: boolean;
  count: number;
};

export function CanvasControls({
  showCanvas,
  courses,
}: {
  showCanvas: boolean;
  courses: CourseRow[];
}) {
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(showCanvas);
  const [hidden, setHidden] = useState(
    Object.fromEntries(courses.map((c) => [c.id, c.isHidden])),
  );

  return (
    <div>
      <label className="flex items-center gap-3 text-caption">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            const v = e.target.checked;
            setOn(v);
            startTransition(async () => {
              await setShowCanvas(v);
            });
          }}
        />
        Show Canvas assignments
      </label>
      <p className="mt-2 text-eyebrow text-ink-soft">
        Off while your new schedule hasn&rsquo;t started — last term&rsquo;s work stays out
        of the week. Syncing still runs, so nothing is lost when you flip it back on.
      </p>

      {courses.length > 0 ? (
        <div className="mt-6">
          <p className="eyebrow mb-3">Courses</p>
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
      ) : null}
    </div>
  );
}
