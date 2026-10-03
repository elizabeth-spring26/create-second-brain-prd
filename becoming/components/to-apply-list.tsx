"use client";

import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ApplicationRow } from "@/components/application-board";
import { createApplication, deleteApplication, updateApplication } from "@/lib/actions/career";
import { cn } from "@/lib/utils";

const WEEKEND_REASON = "Wait for Sun night / Mon morning";
const REASONS = ["Résumé edits", WEEKEND_REASON] as const;

/** Today in her timezone. */
function todayLocalISO(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Sunday is the sending day: on a weekend (or when she's holding it for the
 * weekend) it defaults to the coming Sunday — today, if today is Sunday.
 * Otherwise there's nothing to wait for, so today.
 */
function defaultApplyBy(reason: string) {
  const d = new Date();
  const day = d.getDay(); // 0 Sun … 6 Sat
  const weekend = day === 0 || day === 6;
  if (!weekend && reason !== WEEKEND_REASON) return todayLocalISO(d);
  d.setDate(d.getDate() + ((7 - day) % 7));
  return todayLocalISO(d);
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [, startTransition] = useTransition();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [applyBy, setApplyBy] = useState(defaultApplyBy(REASONS[0]));
  const [error, setError] = useState<string | null>(null);

  function pickReason(r: string) {
    setReason(r);
    setApplyBy(defaultApplyBy(r));
  }

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
        status: "saved",
        nextStep: reason.trim() || null,
        nextStepDate: applyBy || null,
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
            placeholder="Product Analyst Intern"
            className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1"
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="eyebrow">Why not yet</span>
        <div className="flex flex-wrap items-center gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pickReason(r)}
              aria-pressed={reason === r}
              className={cn(
                "rounded-full border-[1.5px] border-ink px-3 py-0.5 text-caption",
                reason === r && "bg-ink text-paper",
              )}
            >
              {r}
            </button>
          ))}
          <input
            value={REASONS.includes(reason as (typeof REASONS)[number]) ? "" : reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Or something else…"
            className="min-w-[160px] flex-1 rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 text-caption"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Apply by</span>
          <input
            type="date"
            value={applyBy}
            onChange={(e) => setApplyBy(e.target.value)}
            className="rounded-[8px] border-[1.5px] border-ink bg-transparent px-2 py-1 font-mono text-caption"
          />
        </label>
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
          Hold it
        </button>
        <button className="text-caption text-ink-soft" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ app, today }: { app: ApplicationRow; today: string }) {
  const [, startTransition] = useTransition();
  const [gone, setGone] = useState(false);

  if (gone) return null;

  const due = app.nextStepDate !== null && app.nextStepDate <= today;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-haze py-4">
      <div className="min-w-[180px] flex-1">
        <p className="text-body">
          {app.company} · <span className="text-ink-soft">{app.role}</span>
        </p>
        {app.nextStep ? (
          <span
            className="mt-1 inline-block rounded-full border-[1.5px] border-ink px-2 text-eyebrow"
            style={{ background: "var(--haze)" }}
          >
            {app.nextStep}
          </span>
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

      <span
        className={cn(
          "font-mono text-eyebrow",
          due ? "rounded-[6px] border-[1.5px] px-1.5 text-ink" : "text-ink-soft",
        )}
        style={due ? { borderColor: "var(--amber)" } : undefined}
      >
        {app.nextStepDate ?? "—"}
      </span>

      <button
        type="button"
        className="btn-cel flex items-center gap-1.5"
        onClick={() =>
          startTransition(async () => {
            setGone(true);
            await updateApplication(app.id, {
              status: "applied",
              appliedOn: today,
              nextStep: null,
              nextStepDate: null,
            });
          })
        }
      >
        <Check size={14} /> Applied
      </button>

      <button
        type="button"
        aria-label={`Remove ${app.company}`}
        title="Remove"
        onClick={() =>
          startTransition(async () => {
            setGone(true);
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
 * Roles she's decided on but is holding back — résumé still needs a pass, or
 * it's the weekend and Sunday night / Monday morning lands better. Marking one
 * applied moves it onto the board below.
 */
export function ToApplyList({ applications }: { applications: ApplicationRow[] }) {
  const [adding, setAdding] = useState(false);
  const today = todayLocalISO();

  const sorted = [...applications].sort((a, b) =>
    (a.nextStepDate ?? "9999").localeCompare(b.nextStepDate ?? "9999"),
  );
  const groups = [
    {
      key: "ready",
      label: "Ready now",
      rows: sorted.filter((a) => a.nextStepDate === null || a.nextStepDate <= today),
    },
    {
      key: "later",
      label: "Later",
      rows: sorted.filter((a) => a.nextStepDate !== null && a.nextStepDate > today),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-end">
        {adding ? null : (
          <button className="btn-cel flex items-center gap-1.5" onClick={() => setAdding(true)}>
            <Plus size={14} /> Hold a job to apply
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
            Nothing waiting. When you find a role but the résumé needs a pass — or it&rsquo;s
            the weekend — park it here with the day you&rsquo;ll send it.
          </p>
        </div>
      ) : (
        groups.map((g) =>
          g.rows.length === 0 ? null : (
            <section key={g.key} className="mb-8">
              <p className="eyebrow mb-2">
                {g.label} · {g.rows.length}
              </p>
              <div>
                {g.rows.map((a) => (
                  <Row key={a.id} app={a} today={today} />
                ))}
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}
