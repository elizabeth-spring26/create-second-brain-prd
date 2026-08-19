"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HabitRing } from "@/components/habit-ring";
import { Wordmark } from "@/components/wordmark";

const TOKENS = [
  ["--paper", "Warm milk. Page background."],
  ["--card", "Card surfaces."],
  ["--ink", "Aubergine-black. Text and every outline."],
  ["--ink-soft", "Secondary text, labels, axis ticks."],
  ["--haze", "Dividers, gridlines, empty rings."],
  ["--iris", "Electric periwinkle. THE accent."],
  ["--sakura", "Self-care, rest, sparkles, celebration."],
  ["--matcha", "Completion, streaks, on track."],
  ["--amber", "Needs attention. The strongest negative signal here."],
] as const;

const TYPE = [
  ["Display", "3.5rem", "text-display font-display"],
  ["Title", "2.25rem", "text-title font-display"],
  ["Heading", "1.5rem", "text-heading font-display"],
  ["Subheading", "1.125rem", "text-subheading"],
  ["Body", "1rem", "text-body"],
  ["Caption", "0.875rem", "text-caption"],
  ["Eyebrow", "0.75rem", "text-eyebrow"],
] as const;

const CHART_DATA = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  energy: Math.round((6 + 2 * Math.sin(i / 2.2)) * 10) / 10,
  sleep: Math.round((7 + 1.3 * Math.sin(i / 3.1 + 1)) * 10) / 10,
}));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-20">
      <p className="eyebrow mb-5">{title}</p>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const [rings, setRings] = useState<Record<string, boolean>>({
    gym: true,
    read: false,
    bed: false,
    scroll: true,
  });

  return (
    <div>
      <h1 className="font-display text-display mb-3">Styleguide</h1>
      <p className="font-reflective text-subheading text-ink-soft mb-16 italic">
        Every color, size, and motion in the app, in one place.
      </p>

      <Section title="Wordmark">
        <div className="flex flex-wrap items-end gap-10">
          <Wordmark className="text-heading" />
          <Wordmark className="text-subheading" />
          <Wordmark className="text-caption" />
        </div>
      </Section>

      <Section title="Color">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOKENS.map(([token, desc]) => (
            <div key={token} className="card-surface flex items-center gap-4">
              <div
                className="size-11 shrink-0 rounded-xl border border-haze"
                style={{ background: `var(${token})` }}
              />
              <div className="min-w-0">
                <p className="font-mono text-caption">{token}</p>
                <p className="text-eyebrow text-ink-soft">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="card-surface space-y-6">
          {TYPE.map(([name, size, cls]) => (
            <div key={name} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="eyebrow w-28 shrink-0">{name}</span>
              <span className={cls}>You&rsquo;re becoming</span>
              <span className="font-mono text-eyebrow text-ink-soft">{size}</span>
            </div>
          ))}
          <div className="border-t border-haze pt-6">
            <span className="eyebrow mb-2 block">Reflective — the journal voice</span>
            <p className="font-reflective text-heading italic">
              What went wrong this week? No softening. Be honest.
            </p>
          </div>
          <div>
            <span className="eyebrow mb-2 block">Data — tabular anything</span>
            <p className="font-mono text-heading">7.5h · 8/10 · 12 days</p>
          </div>
        </div>
      </Section>

      <Section title="Habit rings — tap one">
        <div className="card-surface">
          <div className="flex flex-wrap gap-6">
            <HabitRing
              label="Gym"
              emoji="🏋️"
              progress={rings.gym ? 1 : 0}
              onToggle={(v) => setRings((r) => ({ ...r, gym: v }))}
            />
            <HabitRing
              label="Read"
              emoji="📖"
              progress={rings.read ? 1 : 0}
              onToggle={(v) => setRings((r) => ({ ...r, read: v }))}
            />
            <HabitRing
              label="Bed by 11"
              emoji="🌙"
              progress={rings.bed ? 1 : 0}
              onToggle={(v) => setRings((r) => ({ ...r, bed: v }))}
            />
            <HabitRing
              label="No doomscroll"
              emoji="📵"
              variant="break"
              progress={rings.scroll ? 1 : 0}
              onToggle={(v) => setRings((r) => ({ ...r, scroll: v }))}
            />
            <HabitRing label="Partial" emoji="💧" progress={0.65} />
          </div>
          <p className="text-eyebrow text-ink-soft mt-5">
            Empty is <span className="font-mono">--haze</span>, never a failure state. Break habits
            fill <span className="font-mono">--sakura</span> and count clean days up.
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="card-surface flex flex-wrap items-center gap-4">
          <button className="btn-primary">Log today</button>
          <button className="btn-secondary">Close out the week</button>
          <button className="btn-secondary" disabled style={{ opacity: 0.45 }}>
            Add an offer
          </button>
        </div>
      </Section>

      <Section title="Cards and empty states">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card-surface">
            <p className="eyebrow mb-2">Tonight</p>
            <p className="font-display text-title">7.5h</p>
            <p className="text-caption text-ink-soft">Half an hour more than Tuesday.</p>
          </div>
          <div className="card-surface grid place-items-center text-center">
            <p className="text-caption text-ink-soft">
              No weekly review yet. Sunday evening is a good time.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Chart style">
        <div className="card-surface">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="var(--haze)" strokeDasharray="0" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: "var(--haze)" }}
                  tick={{ fill: "var(--ink-soft)", fontSize: 12, fontFamily: "var(--font-jetbrains)" }}
                />
                <YAxis
                  domain={[0, 10]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--ink-soft)", fontSize: 12, fontFamily: "var(--font-jetbrains)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--haze)",
                    borderRadius: 12,
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: 12,
                    color: "var(--ink)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="var(--iris)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sleep"
                  stroke="var(--sakura)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-eyebrow text-ink-soft mt-4">
            No legend, no vertical gridlines, mono axis labels. Series order: iris, sakura, matcha,
            amber.
          </p>
        </div>
      </Section>

      <Section title="Attention — amber is as negative as it gets">
        <div className="card-surface">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full" style={{ background: "var(--amber)" }} />
            <p className="text-caption">
              <span className="font-mono">2 days overdue</span> · Marketing Analytics problem set
            </p>
          </div>
          <p className="text-eyebrow text-ink-soft mt-4">
            There is no red anywhere in this app. A skipped habit is just haze.
          </p>
        </div>
      </Section>

      <Section title="Category dots">
        <div className="card-surface flex flex-wrap gap-x-8 gap-y-3">
          {[
            ["Networking", "var(--iris)", false],
            ["Friends & family", "var(--sakura)", false],
            ["Self-care", "var(--matcha)", false],
            ["Gym", "var(--matcha)", true],
            ["Work", "var(--ink)", false],
            ["School", "var(--ink-soft)", false],
          ].map(([label, color, outlined]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={
                  outlined
                    ? { border: `1.5px solid ${color as string}` }
                    : { background: color as string }
                }
              />
              <span className="text-caption text-ink-soft">{label as string}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
