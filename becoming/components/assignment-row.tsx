"use client";

import { useState, useTransition } from "react";
import { updateAssignmentOverlay } from "@/lib/actions/school";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  courseName: string | null;
  courseColor: string | null;
  dueLabel: string;
  isOverdue: boolean;
  points: number | null;
  myStatus: "not_started" | "in_progress" | "done";
  myPriority: "low" | "normal" | "high";
  estMinutes: number | null;
  htmlUrl: string | null;
};

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
} as const;

export function AssignmentRow(a: Props) {
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(a.myStatus);
  const [priority, setPriority] = useState(a.myPriority);
  const [est, setEst] = useState(a.estMinutes?.toString() ?? "");

  function push(patch: Parameters<typeof updateAssignmentOverlay>[0]) {
    startTransition(async () => {
      await updateAssignmentOverlay(patch);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-haze py-4">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ background: `var(--${a.courseColor ?? "ink-soft"})` }}
      />

      <div className="min-w-[220px] flex-1">
        {a.htmlUrl ? (
          <a
            href={a.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className={cn("text-body hover:underline", status === "done" && "text-ink-soft")}
          >
            {a.title}
          </a>
        ) : (
          <span className="text-body">{a.title}</span>
        )}
        <p className="text-eyebrow text-ink-soft">
          {a.courseName ?? "Manual"}
          {a.points != null ? ` · ${a.points} pts` : ""}
        </p>
      </div>

      <span
        className="font-mono text-eyebrow"
        style={{ color: a.isOverdue ? "var(--amber)" : "var(--ink-soft)" }}
      >
        {a.dueLabel}
      </span>

      <select
        aria-label="Status"
        value={status}
        onChange={(e) => {
          const v = e.target.value as Props["myStatus"];
          setStatus(v);
          push({ id: a.id, myStatus: v });
        }}
        className="rounded-control border border-haze bg-transparent px-2 py-1 text-eyebrow"
      >
        {Object.entries(STATUS_LABEL).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>

      <select
        aria-label="Priority"
        value={priority}
        onChange={(e) => {
          const v = e.target.value as Props["myPriority"];
          setPriority(v);
          push({ id: a.id, myPriority: v });
        }}
        className="rounded-control border border-haze bg-transparent px-2 py-1 text-eyebrow"
      >
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
      </select>

      <input
        aria-label="Estimated minutes"
        value={est}
        onChange={(e) => setEst(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => push({ id: a.id, estMinutes: est === "" ? null : Number(est) })}
        placeholder="—"
        className="w-14 rounded-control border border-haze bg-transparent px-2 py-1 text-center font-mono text-eyebrow"
      />
    </div>
  );
}
