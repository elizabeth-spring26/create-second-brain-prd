import { SyncButton } from "@/components/sync-button";
import { Card, Empty, Eyebrow, PageHeader, Stat } from "@/components/ui";
import { canvasConfigured } from "@/lib/canvas/client";
import { getSyncState } from "@/lib/canvas/sync";
import { easternTime, shortDate, toLogDate } from "@/lib/dates";
import { googleConfigured } from "@/lib/google/client";
import { granolaConfigured } from "@/lib/granola/client";
import { getSettings } from "@/lib/queries/daily";

export const dynamic = "force-dynamic";

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2 text-caption">
      <span
        className="size-2 rounded-full"
        style={{ background: ok ? "var(--matcha)" : "var(--haze)" }}
      />
      {label}
    </span>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;
  const [settings, canvasState, granolaState, googleState] = await Promise.all([
    getSettings(),
    getSyncState("canvas"),
    getSyncState("granola"),
    getSyncState("google_calendar"),
  ]);

  return (
    <div className="max-w-[720px]">
      <PageHeader title="Settings" />

      {google ? (
        <Card className="mb-8">
          <p className="text-caption">
            {google === "connected"
              ? "Google Calendar is connected."
              : `Google said: ${google}`}
          </p>
        </Card>
      ) : null}

      <Card className="mb-8">
        <Eyebrow className="mb-5">Your targets</Eyebrow>
        {settings ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Sleep" value={settings.sleepGoalHours ? `${settings.sleepGoalHours}h` : "—"} />
            <Stat label="Bed" value={settings.bedGoal ?? "—"} />
            <Stat label="Wake" value={settings.wakeGoal ?? "—"} />
            <Stat label="Energy" value={settings.energyGoal ?? "—"} />
          </div>
        ) : (
          <Empty>No settings row yet — run the seed.</Empty>
        )}
      </Card>

      <Card className="mb-8">
        <Eyebrow className="mb-5">Integrations</Eyebrow>
        <div className="space-y-6">
          {/* Canvas */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <Status ok={canvasConfigured()} label="Canvas — read-only" />
              <SyncButton provider="canvas" />
            </div>
            <p className="text-eyebrow text-ink-soft">
              {canvasState?.lastError
                ? `Last error: ${canvasState.lastError}`
                : canvasState?.lastSuccessAt
                  ? `Last synced ${shortDate(toLogDate(canvasState.lastSuccessAt))} at ${easternTime(canvasState.lastSuccessAt)}`
                  : "Never synced."}
            </p>
          </div>

          {/* Granola */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <Status ok={granolaConfigured()} label="Granola — read-only" />
              <SyncButton provider="granola" />
            </div>
            <p className="text-eyebrow text-ink-soft">
              {granolaState?.lastError
                ? `Last error: ${granolaState.lastError}`
                : granolaState?.lastSuccessAt
                  ? `Last synced ${shortDate(toLogDate(granolaState.lastSuccessAt))} at ${easternTime(granolaState.lastSuccessAt)}`
                  : "Never synced."}
            </p>
          </div>

          {/* Google */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <Status
                ok={Boolean(googleState?.refreshToken)}
                label="Google Calendar — two-way"
              />
              {googleConfigured() ? (
                <a href="/api/google/connect" className="btn-secondary">
                  {googleState?.refreshToken ? "Reconnect" : "Connect"}
                </a>
              ) : null}
            </div>
            <p className="text-eyebrow text-ink-soft">
              {googleConfigured()
                ? googleState?.lastError
                  ? `Last error: ${googleState.lastError}`
                  : googleState?.lastSuccessAt
                    ? `Last synced ${shortDate(toLogDate(googleState.lastSuccessAt))}`
                    : "Connected but not synced yet."
                : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable."}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <Eyebrow className="mb-3">What this app never does</Eyebrow>
        <ul className="space-y-1.5 text-caption text-ink-soft">
          <li>Writes to Canvas or Granola. Both are read-only.</li>
          <li>Tracks weight, calories, macros, or any body metric.</li>
          <li>Decides an offer for you.</li>
          <li>Shows you a red number or a broken streak.</li>
        </ul>
      </Card>
    </div>
  );
}
