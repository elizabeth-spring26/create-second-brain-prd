"use client";

import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fitLine } from "@/lib/stats";

export function SleepScatter({ points }: { points: { x: number; y: number }[] }) {
  const fit = fitLine(
    points.map((p) => p.x),
    points.map((p) => p.y),
  );

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const lineData = fit
    ? [
        { x: minX, y: fit.slope * minX + fit.intercept },
        { x: maxX, y: fit.slope * maxX + fit.intercept },
      ]
    : [];

  const tick = {
    fill: "var(--ink-soft)",
    fontSize: 12,
    fontFamily: "var(--font-jetbrains)",
  };

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: -22 }}>
          <CartesianGrid vertical={false} stroke="var(--haze)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Sleep"
            unit="h"
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
            tickLine={false}
            axisLine={{ stroke: "var(--haze)" }}
            tick={tick}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Energy"
            domain={[0, 10]}
            tickLine={false}
            axisLine={false}
            tick={tick}
          />
          <Tooltip
            cursor={{ stroke: "var(--haze)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--haze)",
              borderRadius: 12,
              fontFamily: "var(--font-jetbrains)",
              fontSize: 12,
              color: "var(--ink)",
            }}
          />
          <Scatter data={points} fill="var(--iris)" fillOpacity={0.7} />
          {lineData.length === 2 ? (
            <Line
              data={lineData}
              dataKey="y"
              stroke="var(--sakura)"
              strokeWidth={2}
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
          ) : null}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
