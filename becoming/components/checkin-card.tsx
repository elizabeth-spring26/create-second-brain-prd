"use client";

import { useState, useTransition } from "react";
import { saveCheckin, type CheckinInput } from "@/lib/actions/daily";
import { sleepHoursBetween } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Checkin = {
  bedTime: string | null;
  wakeTime: string | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  energyMorning: number | null;
  energyEvening: number | null;
  moodWord: string | null;
  gratitude: string | null;
  drain: string | null;
};

type Props = {
  logDate: string;
  initial: Checkin | null;
  /** Which pass to open on, decided by the hour. She can switch. */
  defaultMode: "morning" | "evening";
  bedGoal: string | null;
  wakeGoal: string | null;
};

function Dots({
  value,
  onChange,
  count = 5,
  label,
}: {
  value: number | null;
  onChange: (n: number) => void;
  count?: number;
  label: string;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={label}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} of ${count}`}
          onClick={() => onChange(n)}
          className="size-7 rounded-full border transition-all"
          style={{
            background: value !== null && n <= value ? "var(--iris)" : "transparent",
            borderColor: value !== null && n <= value ? "var(--iris)" : "var(--haze)",
          }}
        />
      ))}
    </div>
  );
}

function EnergySlider({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (n: number) => void;
  label: string;
}) {
  const v = value ?? 5;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="font-mono text-subheading">{value === null ? "—" : `${value}/10`}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full appearance-none rounded-full outline-none"
        style={{
          height: 6,
          background: `linear-gradient(to right, var(--iris) ${((v - 1) / 9) * 100}%, var(--haze) ${((v - 1) / 9) * 100}%)`,
        }}
      />
    </div>
  );
}

export function CheckinCard({ logDate, initial, defaultMode, bedGoal, wakeGoal }: Props) {
  const [mode, setMode] = useState<"morning" | "evening">(defaultMode);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [bedTime, setBedTime] = useState(initial?.bedTime ?? bedGoal ?? "23:00");
  const [wakeTime, setWakeTime] = useState(initial?.wakeTime ?? wakeGoal ?? "08:00");
  const [sleepQuality, setSleepQuality] = useState<number | null>(initial?.sleepQuality ?? null);
  const [energyMorning, setEnergyMorning] = useState<number | null>(
    initial?.energyMorning ?? null,
  );
  const [energyEvening, setEnergyEvening] = useState<number | null>(
    initial?.energyEvening ?? null,
  );
  const [moodWord, setMoodWord] = useState(initial?.moodWord ?? "");
  const [drain, setDrain] = useState(initial?.drain ?? "");
  const [gratitude, setGratitude] = useState(initial?.gratitude ?? "");

  const sleepHours = sleepHoursBetween(bedTime, wakeTime);

  function submit() {
    const payload: CheckinInput =
      mode === "morning"
        ? { logDate, bedTime, wakeTime, sleepHours, sleepQuality, energyMorning }
        : {
            logDate,
            energyEvening,
            moodWord: moodWord || null,
            drain: drain || null,
            gratitude: gratitude || null,
          };

    startTransition(async () => {
      const res = await saveCheckin(payload);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }
    });
  }

  return (
    <div className="card-surface">
      <div className="mb-6 flex items-center justify-between">
        <p className="eyebrow">{mode === "morning" ? "This morning" : "Tonight"}</p>
        <div className="flex gap-1" role="tablist" aria-label="Check-in pass">
          {(["morning", "evening"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-control px-3 py-1 text-eyebrow capitalize transition-colors",
                mode === m ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
              style={mode === m ? { background: "var(--haze)" } : undefined}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "morning" ? (
        <div className="space-y-7">
          <div className="flex flex-wrap items-end gap-6">
            <label className="flex flex-col gap-2">
              <span className="eyebrow">Bed</span>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="rounded-control border border-haze bg-transparent px-3 py-2 font-mono text-caption"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="eyebrow">Up</span>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="rounded-control border border-haze bg-transparent px-3 py-2 font-mono text-caption"
              />
            </label>
            <div className="pb-1">
              <p className="eyebrow mb-1">That&rsquo;s</p>
              <p className="font-mono text-heading leading-none">{sleepHours}h</p>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">How well you slept</p>
            <Dots value={sleepQuality} onChange={setSleepQuality} label="Sleep quality" />
          </div>

          <EnergySlider
            value={energyMorning}
            onChange={setEnergyMorning}
            label="Energy right now"
          />
        </div>
      ) : (
        <div className="space-y-7">
          <EnergySlider
            value={energyEvening}
            onChange={setEnergyEvening}
            label="Energy right now"
          />

          <label className="block">
            <span className="eyebrow mb-2 block">One word for today</span>
            <input
              value={moodWord}
              onChange={(e) => setMoodWord(e.target.value)}
              placeholder="steady"
              maxLength={40}
              className="w-full rounded-control border border-haze bg-transparent px-3 py-2 text-body"
            />
          </label>

          <label className="block">
            <span className="eyebrow mb-2 block">What drained you</span>
            <textarea
              value={drain}
              onChange={(e) => setDrain(e.target.value)}
              rows={2}
              placeholder="Back-to-back calls with no gap"
              className="w-full resize-none rounded-control border border-haze bg-transparent px-3 py-2 text-body"
            />
          </label>

          <label className="block">
            <span className="eyebrow mb-2 block">One thing you&rsquo;re grateful for</span>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-control border border-haze bg-transparent px-3 py-2 text-body"
            />
          </label>
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Log today"}
        </button>
        {saved ? <span className="text-eyebrow text-ink-soft">Saved.</span> : null}
      </div>
    </div>
  );
}
