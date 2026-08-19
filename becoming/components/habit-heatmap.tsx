import { lastNDates, shortDate } from "@/lib/dates";

/**
 * 12 weeks of days. Empty is --haze (never a failure state), kept is --matcha
 * for build habits and --sakura for break habits — the colour she associates
 * with rest and letting go.
 */
export function HabitHeatmap({
  loggedDates,
  direction,
  weeks = 12,
}: {
  loggedDates: string[];
  direction: "build" | "break";
  weeks?: number;
}) {
  const days = weeks * 7;
  const dates = lastNDates(days);
  const logged = new Set(loggedDates);
  const fill = direction === "break" ? "var(--sakura)" : "var(--matcha)";

  // Column-major so each column reads as one week.
  const columns: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) columns.push(dates.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]" style={{ minWidth: columns.length * 11 }}>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((iso) => {
              const kept = direction === "build" ? logged.has(iso) : !logged.has(iso);
              return (
                <div
                  key={iso}
                  title={`${shortDate(iso)} — ${kept ? "kept" : "—"}`}
                  className="size-2 rounded-[5px]"
                  style={{
                    width: 8,
                    height: 8,
                    background: kept ? fill : "var(--haze)",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
