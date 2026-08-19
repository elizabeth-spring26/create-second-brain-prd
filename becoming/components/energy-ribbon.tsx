"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export type RibbonPoint = {
  /** YYYY-MM-DD */
  date: string;
  /** 1–10, or null for a day with no check-in */
  energy: number | null;
  /** hours slept, or null */
  sleep: number | null;
};

type Props = {
  points: RibbonPoint[];
  className?: string;
};

const HEIGHT = 56;
const AMPLITUDE = 40; // max vertical travel — subtle enough to read as decoration
const PAD_X = 12;
const SLEEP_TICK_THRESHOLD = 7.5;

/**
 * Module-level so the draw-in plays once per full page load, not on every
 * route change (the ribbon lives in the layout, so it rarely remounts anyway).
 */
let hasDrawn = false;

/** Catmull-Rom through every point, emitted as cubic beziers. */
function splinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function EnergyRibbon({ points, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [dash, setDash] = useState<number | null>(null);

  // Measure in real pixels so the stroke stays crisp and hover math is honest.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Only plot days that actually have energy logged.
  const plotted = useMemo(
    () => points.filter((p): p is RibbonPoint & { energy: number } => p.energy !== null),
    [points],
  );

  const coords = useMemo(() => {
    if (width <= 0 || plotted.length === 0) return [];
    const inner = Math.max(width - PAD_X * 2, 1);
    const step = plotted.length > 1 ? inner / (plotted.length - 1) : 0;
    const mid = HEIGHT / 2;
    return plotted.map((p, i) => ({
      x: PAD_X + step * i,
      // energy 1–10 -> centered band of AMPLITUDE px, inverted for SVG's y-down
      y: mid - ((p.energy - 5.5) / 4.5) * (AMPLITUDE / 2),
      point: p,
    }));
  }, [plotted, width]);

  const d = useMemo(() => splinePath(coords), [coords]);

  // Draw-in: measure the real path length, then animate the dash offset to 0.
  useEffect(() => {
    if (!pathRef.current || !d) return;
    if (hasDrawn) {
      setDash(null);
      return;
    }
    const len = pathRef.current.getTotalLength();
    setDash(len);
    hasDrawn = true;
  }, [d]);

  if (plotted.length === 0) {
    return (
      <div ref={wrapRef} className={className} style={{ height: HEIGHT }} aria-hidden="true" />
    );
  }

  const last = coords[coords.length - 1];
  const active = hover !== null ? coords[hover] : null;

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ height: HEIGHT, position: "relative" }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        if (coords.length === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let nearest = 0;
        let best = Infinity;
        for (let i = 0; i < coords.length; i++) {
          const dist = Math.abs(coords[i].x - x);
          if (dist < best) {
            best = dist;
            nearest = i;
          }
        }
        setHover(nearest);
      }}
    >
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${Math.max(width, 1)} ${HEIGHT}`}
        role="img"
        aria-label={`Daily energy over the last ${plotted.length} days`}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Faint ticks under nights with real sleep. */}
        {coords.map((c, i) =>
          c.point.sleep !== null && c.point.sleep >= SLEEP_TICK_THRESHOLD ? (
            <line
              key={`tick-${i}`}
              x1={c.x}
              x2={c.x}
              y1={HEIGHT - 10}
              y2={HEIGHT - 2}
              stroke="var(--haze)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ) : null,
        )}

        <path
          ref={pathRef}
          className="ribbon-path"
          d={d}
          fill="none"
          stroke="var(--iris)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            dash !== null
              ? {
                  strokeDasharray: dash,
                  strokeDashoffset: dash,
                  animation: "ribbon-draw 900ms var(--ease-becoming) forwards",
                }
              : undefined
          }
        />

        {/* Hover marker */}
        {active ? (
          <circle cx={active.x} cy={active.y} r={3.5} fill="var(--iris)" />
        ) : null}

        {/* Today — a single sakura petal riding the curve. */}
        <g className="petal-float" transform={`translate(${last.x}, ${last.y})`}>
          <path
            d="M 0 -5 C 2.8 -2.6, 2.8 2.6, 0 5 C -2.8 2.6, -2.8 -2.6, 0 -5 Z"
            fill="var(--sakura)"
          />
        </g>
      </svg>

      {active ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(active.x, 40), Math.max(width - 40, 40)),
            top: -6,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
          className="rounded-lg border border-haze bg-card px-2 py-1 font-mono text-eyebrow text-ink-soft shadow-sm"
        >
          {active.point.date} · {active.point.energy}/10
          {active.point.sleep !== null ? ` · ${active.point.sleep}h` : ""}
        </div>
      ) : null}
    </div>
  );
}
