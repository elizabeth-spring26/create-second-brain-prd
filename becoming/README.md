# BECOMING

A personal operating system that measures consistency and energy, not output.

Single user. No login in the app — access is controlled by Vercel Deployment
Protection in production, and by the fact that it's `localhost` in development.

## Stack

- Next.js 15 (App Router), TypeScript strict
- Tailwind v4, tokens in `app/globals.css` mapped into `@theme`
- Turso (libSQL) + Drizzle ORM — SQLite semantics, works serverless
- Recharts for charts, hand-written SVG for the Energy Ribbon
- Zod on every external API response

## Local setup (Windows / PowerShell)

```powershell
npm install
copy .env.example .env.local     # then fill it in
npx drizzle-kit migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. The styleguide lives at `/styleguide`.

Local dev uses a SQLite file at `data/becoming.db` — it's gitignored.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (webpack — see note below) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Sync + streak tests, against the live APIs |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Idempotent seed — safe to re-run |
| `npm run db:check` | Print tables and indexes |

**Why the build isn't on Turbopack:** `@libsql/hrana-client` ships a `LICENSE`
file that Turbopack's resolver tries to parse as JavaScript, which fails the
build. Dev still uses Turbopack; only `build` falls back to webpack.

## Production database (Turso)

The local `file:` database cannot run on Vercel — serverless filesystems are
ephemeral, so a `.db` file written on one request is gone by the next. Turso is
libSQL (i.e. SQLite) over HTTP, so the same schema and queries work in both
places.

**Use the web dashboard, not the CLI.** The Turso CLI requires WSL on Windows,
and the `turso` package on npm is a different project entirely (the SQLite
rewrite engine, not the cloud CLI) — installing it gets you the wrong tool.

1. Sign up at <https://turso.tech> and create a database named `becoming`
2. Copy its **Database URL** (`libsql://becoming-<org>.turso.io`)
3. Create a **token** for it and copy that too

Then, locally:

```powershell
# point .env.local at the remote, then:
npx drizzle-kit migrate
npm run db:seed
```

And on Vercel:

```powershell
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production
```

To keep using the local file for day-to-day development, leave
`TURSO_DATABASE_URL=file:./data/becoming.db` in `.env.local` and set the remote
values only in Vercel.

## Deploy

```powershell
npm i -g vercel
vercel link                                  # Root Directory = becoming
vercel env add TURSO_DATABASE_URL production # repeat for each var
vercel --prod
```

**Turn on Deployment Protection** in the Vercel dashboard before the first
production deploy. There is no login in the app, so that setting is the only
thing between your grades, meeting notes, and comp numbers and the open
internet.

### Cron frequency

`vercel.json` asks for the calendar sync every 15 minutes. **Vercel's Hobby plan
only permits daily crons** — if the deploy is rejected, change the calendar
entry to `0 6 * * *` and rely on sync-on-focus of `/calendar` for freshness.
Documented here rather than silently downgraded.

## Google Calendar

Google is used purely as an API credential, not as a login. Create an OAuth
client in Google Cloud Console, enable the Calendar API, and add:

- `http://localhost:3000/api/google/callback` (dev)
- `https://<your-domain>/api/google/callback` (prod)

Then `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and hit **Connect** on
`/settings`.

**You only get a refresh token on first consent.** The connect URL sends
`access_type=offline` and `prompt=consent` for exactly this reason. If you ever
test without them, revoke access at myaccount.google.com and reconnect,
otherwise Google returns no refresh token and sync can't run unattended.

Use a personal Gmail rather than a Babson account — university Workspace
tenants commonly block unverified third-party OAuth apps.

## Integration rules

- **Canvas is read-only.** No submissions, no grade changes, ever.
- **Granola is read-only.**
- Canvas sync merges: `my_status`, `my_priority`, and `est_minutes` are hers and
  are never overwritten by a sync. There's a test for it.
- Google Calendar is the only two-way integration. Events this app creates carry
  `extendedProperties.private.becomingId` so they're recognised on the next pull
  and updated rather than re-imported as duplicates.
- A `410 GONE` on the Google `syncToken` triggers a clean full resync.

## Guardrails

No weight, calorie, macro, or body-metric tracking. No streak-shaming or guilt
copy. No red in the UI — amber is the strongest negative signal, and a skipped
habit is just `--haze`. Insights describe correlations in her own logged data
and make no health claims. The offer matrix never picks an offer.
