"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import {
  createApplication,
  deleteApplication,
  setApplicationStatus,
} from "@/lib/actions/career";
import { cn } from "@/lib/utils";

export type AppStatus =
  | "saved"
  | "applied"
  | "phone_screen"
  | "interviewing"
  | "final"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "accepted";

export type ApplicationRow = {
  id: string;
  company: string;
  role: string;
  status: AppStatus;
  appliedOn: string | null;
  postingUrl: string | null;
  nextStep: string | null;
  nextStepDate: string | null;
};

/**
 * Four states cover the whole life of an application: you're eyeing it, you
 * sent it, someone's talking to you, it ended. `offer` sits between the last
 * two because it's the only ending worth its own colour. The older Canvas-era
 * statuses (phone_screen, final, withdrawn, accepted) still render if a row
 * already carries one — they're just not offered as new choices.
 */
const PRIMARY: { value: AppStatus; label: string; token: string }[] = [
  { value: "saved", label: "Saved", token: "haze" },
  { value: "applied", label: "Applied", token: "sky" },
  { value: "interviewing", label: "Interviewing", token: "iris" },
  { value: "offer", label: "Offer", token: "matcha" },
  { value: "rejected", label: "Rejected", token: "sakura" },
];

const LEGACY: Record<string, string> = {
  phone_screen: "Phone screen",
  final: "Final round",
  withdrawn: "Withdrawn",
  accepted: "Accepted",
};

function labelOf(status: string) {
  return PRIMARY.find((s) => s.value === status)?.label ?? LEGACY[status] ?? status;
}

function tokenOf(status: string) {
  return PRIMARY.find((s) => s.value === status)?.token ?? "iris";
}

/** Today in her timezone, as the default "applied on". */
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [, startTransition] = useTransition();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [appliedOn, setAppliedOn] = useState(todayLocalISO());
  const [status, setStatus] = useState<AppStatus>("applied");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!company.trim() || !role.trim()) {
      setError("A company and a role — that's all it needs.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createApplication({
        company: company.trim(),
        role: role.trim(),
        status,
        appliedOn: status === "saved" ? null : appliedOn || null,
        postingUrl: url.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="card-cel space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1">
          <span className="eyebrow">Company</span>
          <input
            autoFocus
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Wayfair"
            className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1"
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="eyebrow">Role</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Product Analyst Intern"
            className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Where it stands</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppStatus)}
            className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-[7px] text-caption"
          >
            {PRIMARY.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {status === "saved" ? null : (
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Applied on</span>
            <input
              type="date"
              value={appliedOn}
              onChange={(e) => setAppliedOn(e.target.value)}
              className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 font-mono text-caption"
            />
          </label>
        )}

        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="eyebrow">Link (optional)</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="https://…"
            className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1"
          />
        </label>
      </div>

      {error ? <p className="text-caption" style={{ color: "var(--iris)" }}>{error}</p> : null}

      <div className="flex items-center gap-4">
        <button className="btn-cel" onClick={save}>
          Track it
        </button>
        <button className="text-caption text-ink-soft" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ app }: { app: ApplicationRow }) {
  const [, startTransition] = useTransition();
  const [status, setStatus] = useOptimistic(
    app.status,
    (_: AppStatus, next: AppStatus) => next,
  );
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-haze py-4">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full border-[1.5px] border-ink"
        style={{ background: `var(--${tokenOf(status)})` }}
      />

      <div className="min-w-[180px] flex-1">
        <p className="text-body">
          {app.company} · <span className="text-ink-soft">{app.role}</span>
        </p>
        {app.nextStep ? (
          <p className="text-eyebrow text-ink-soft">
            Next: {app.nextStep}
            {app.nextStepDate ? ` · ${app.nextStepDate}` : ""}
          </p>
        ) : null}
      </div>

      {app.postingUrl ? (
        <a
          href={app.postingUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open the ${app.company} posting`}
          className="text-ink-soft transition-colors hover:text-ink"
        >
          <ExternalLink size={14} />
        </a>
      ) : null}

      <span className="font-mono text-eyebrow text-ink-soft">{app.appliedOn ?? "—"}</span>

      <select
        value={status}
        aria-label={`Status for ${app.company}`}
        onChange={(e) => {
          const next = e.target.value as AppStatus;
          startTransition(async () => {
            setStatus(next);
            await setApplicationStatus(app.id, next);
          });
        }}
        className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-caption"
      >
        {PRIMARY.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
        {/* Keeps a legacy value visible instead of silently re-labelling it. */}
        {PRIMARY.some((s) => s.value === status) ? null : (
          <option value={status}>{labelOf(status)}</option>
        )}
      </select>

      <button
        type="button"
        aria-label={`Remove ${app.company}`}
        title="Remove"
        onClick={() =>
          startTransition(async () => {
            setRemoved(true);
            await deleteApplication(app.id);
          })
        }
        className="text-ink-soft transition-colors hover:text-ink"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/**
 * Grouped so the two questions she actually asks — "who's still talking to
 * me?" and "what have I sent?" — are answered without reading the whole list.
 * Rejected sinks to the bottom rather than disappearing: the count is the
 * honest denominator behind the funnel above.
 */
export function ApplicationBoard({ applications }: { applications: ApplicationRow[] }) {
  const [adding, setAdding] = useState(false);

  const groups: { key: string; label: string; rows: ApplicationRow[] }[] = [
    {
      key: "live",
      label: "In play",
      rows: applications.filter((a) =>
        ["interviewing", "phone_screen", "final", "offer", "accepted"].includes(a.status),
      ),
    },
    {
      key: "applied",
      label: "Applied, waiting",
      rows: applications.filter((a) => a.status === "applied"),
    },
    {
      key: "closed",
      label: "Closed",
      rows: applications.filter((a) => ["rejected", "withdrawn"].includes(a.status)),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-end">
        {adding ? null : (
          <button className="btn-cel flex items-center gap-1.5" onClick={() => setAdding(true)}>
            <Plus size={14} /> Log an application
          </button>
        )}
      </div>

      {adding ? (
        <div className="mb-8">
          <AddForm onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {applications.length === 0 ? (
        <div className="card-surface">
          <p className="text-caption text-ink-soft">
            Nothing tracked yet. Log the roles you&rsquo;ve sent and move each one along
            as you hear back — the funnel above starts telling you something real.
          </p>
        </div>
      ) : (
        groups.map((g) =>
          g.rows.length === 0 ? null : (
            <section key={g.key} className={cn("mb-10", g.key === "closed" && "opacity-70")}>
              <p className="eyebrow mb-2">
                {g.label} · {g.rows.length}
              </p>
              <div>
                {g.rows.map((a) => (
                  <Row key={a.id} app={a} />
                ))}
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}
