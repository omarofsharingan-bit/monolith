# مونوليث · MONOLITH

A brutalist, cyber-noir **financial vault dashboard** for university student clubs and
startup spin-offs — for managing project funding and equity splits transparently.

Arabic-first (RTL from the root element), Modern Standard Arabic throughout, western
digits (0–9) with SAR.

---

## Stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router) + TypeScript                              |
| Styling    | Tailwind CSS 3.4 with logical properties (`ps-/pe-/ms-/me-`)      |
| Data       | SQLite via `better-sqlite3`, raw SQL (no ORM)                     |
| Auth       | NextAuth / Auth.js v5, credentials provider, JWT sessions         |
| Charts     | Recharts                                                          |
| Deploy     | Render (`render.yaml` included)                                   |

---

## Running locally

```bash
npm install
```

Create `.env.local`:

```bash
AUTH_SECRET=any-long-random-string
DATABASE_PATH=.data/monolith.db
```

Then:

```bash
npm run dev
```

Open <http://localhost:3000>. The database is created and seeded automatically on first
request — no migration step.

### Demo accounts

All three share the password `monolith2026`:

| Email                      | Name                | Role                  |
| -------------------------- | ------------------- | --------------------- |
| `treasurer@monolith.demo`  | نورة العتيبي        | أمين الصندوق          |
| `founder@monolith.demo`    | عبدالرحمن القحطاني  | مؤسس                  |
| `member@monolith.demo`     | ريم الدوسري         | عضو                   |

The login screen lists them; clicking one fills the form.

### Resetting the demo

Delete the database and it reseeds on the next request:

```bash
rm -rf .data
```

To change the seed data itself, edit `scripts/generate-seed.mjs` and run:

```bash
node scripts/generate-seed.mjs
```

It prints the resulting monthly balances, burn rate and runway so the demo numbers can
be sanity-checked before committing.

---

## Screens

| Route     | What it is                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| `/`       | **Vault door** — balance, split integrity, net month, runway, plus summaries of all four subsystems. Opens with a four-step start guide |
| `/ledger` | **Equity ledger** — stakeholder CRUD, split validation, disbursement, audit chain |
| `/bank`   | **Simulated bank sync** — mock transaction feed with a live polling pipeline    |
| `/burn`   | **Burn rate** — balance history against a linear trend projection              |
| `/import` | **Data import** — replace the demo data with real transactions from a CSV or JSON file |

### Telling people what to do

Two pieces of in-app orientation, because a vault full of someone else's demo data
explains nothing on its own:

- **`دليل البدء` on the dashboard** — four numbered steps (set the split → import your
  transactions → watch the burn → distribute), each linking to the screen it describes.
  Dismissible, remembered in `localStorage`, and rendered open on the server so it is
  still there for anyone with storage blocked.
- **`من أين تأتي البيانات؟` on the import page** — names all three data sources
  explicitly: the preloaded demo seed, the simulated bank feed, and manual import. Nobody
  should have to guess which numbers on screen are real.

---

## Design language

Pure black `#0A0A0A`, bone white `#F5F5F5`, and **one** accent — amber `#FFB000`, used
only for alerts, highlights and unallocated equity. No rounded corners, no shadows, no
gradients: `borderRadius` and `boxShadow` are stripped from the Tailwind theme entirely,
so a stray `rounded-lg` cannot reintroduce them. Sections are separated by 1–2px
hairlines.

Motion is mechanical — a single `cubic-bezier(0.2, 0, 0, 1)` easing, 100–180ms, no
overshoot, and everything collapses under `prefers-reduced-motion`.

### Typography, and the Arabic/Latin contrast

Three families, each with one job:

- **Noto Kufi Arabic** — headers and headline figures. Monolithic, blocky, matches the vibe.
- **IBM Plex Sans Arabic** — body copy and data.
- **JetBrains Mono** — *reserved strictly for system/status text*: `SYNCED`, `VERIFIED`,
  `PENDING`, transaction references, timestamps, panel eyebrow labels. Uppercase, wide
  tracking, LTR-isolated.

That third register is a deliberate stylistic device — exposed terminal output against
Arabic prose. It is enforced by the `.sys` utility in `globals.css`, and Arabic text is
never placed inside it (which is why the footer reads `V0.1 · DEMO BUILD` rather than an
Arabic version string).

### RTL

`dir="rtl"` is set on `<html>` in the root layout and the app was built that way from the
first component — nothing was retrofitted. Tailwind logical properties are used
throughout. Directional details that needed explicit handling:

- **Burn chart** — the X axis is `reversed` so time runs right-to-left, and the Y axis is
  moved to the right edge where an RTL reader expects it.
- **Equity bar** — a flex row inside `dir="rtl"` fills from the right, so the first
  stakeholder reads first with no extra work.
- **Audit chain** — the spine sits on the reading edge via `start-*`, and the
  from → to chevron points leftward (`←`), which is "onward" in RTL.

### Numerals

Every number goes through `src/lib/format.ts`, which formats with `Intl.NumberFormat("en-US")`
so the codepoints are always western `0-9` even inside Arabic text. The `.num` utility
adds `direction: ltr` + `unicode-bidi: isolate` + tabular figures so `5,000 ريال` never
reorders. Dates are Gregorian with Arabic month names (`21 يناير 2027`) — and years are
never thousands-grouped.

### i18n

Arabic is the only shipped language, but no string is hardcoded in a component. Everything
lives in `src/lib/i18n/ar.json` behind `getDictionary()` / `dict`, so a second locale is a
new file rather than a rewrite.

---

## The four subsystems

### 1. Equity / fund split ledger

The centrepiece. Ownership is drawn as a **stark horizontal manifest bar**, not a pie —
segments distinguished by stepped luminance of the same bone white, with the accent
reserved for the *unallocated remainder*, which is an alert state rather than a category.

- Add / edit / remove stakeholders, each write paired with its audit entry in a single
  SQLite transaction.
- Splits are validated to sum to exactly 100% (within a 0.001 float tolerance).
- **Disbursement is blocked server-side when the manifest is unbalanced** — not merely
  disabled in the UI. That check lives in `distributeAction`, so it holds even if the
  button is bypassed.
- Allocation rounds to two decimals and gives the rounding remainder to the largest
  shareholder, so the parts always add back to the exact total.

### 2. Audit log — the trust mechanism

Append-only by construction: nothing in the codebase issues an `UPDATE` or `DELETE`
against `audit_log`, and the only way to write to it is `writeAudit()` inside
`src/lib/repo.ts`, which every mutation calls in the same transaction as the change
itself. Entries record actor, action, timestamp, and the before → after values.

### 3. Simulated bank sync

**There is no bank integration, and the UI says so above the data, not in fine print.**
`POST /api/bank/sync` advances a purely local reconciliation pipeline
(`PENDING → SYNCED → VERIFIED`) and appends a plausible small movement about 45% of the
time. The client polls every 7s, with pause/resume and a manual sync. Newly landed rows
are flagged on the reading edge for 45 seconds.

No copy anywhere implies a live connection to SAMA, any bank, or any aggregator.

The generated rows are **capped at 15** (`MAX_SIMULATED` in `src/lib/repo.ts`) and carry
a `SIM-` reference prefix. Past the cap the oldest simulated row is dropped as a new one
lands. Without that ceiling a tab left open buries the seeded history — an early build
accumulated 130 synthetic rows during testing and pulled the balance with it.

### 5. Data import

`/import` is the only way real data enters the vault. It accepts a CSV or JSON file, or
pasted text, and requires `type`, `amount` and `description` columns (`account` and
`timestamp` are optional). The format is documented on the page with a downloadable
template — served with a UTF-8 BOM so Excel opens Arabic descriptions correctly instead
of mojibake.

Parsing and validation live in `src/lib/import.ts`, which is pure: the browser runs it to
build the preview and the server runs the identical function before writing, so the rows
the user approved are the rows that land. Every row is validated individually and bad
ones are listed with their line number and the reason, rather than failing the whole
file. Imported rows enter as `VERIFIED` (a statement line is already settled), the whole
insert runs in one transaction, and it writes its own audit entry.

The confirmation is carried in the URL (`/import?imported=3`) rather than in form state,
because the action revalidates other routes and that remounts this route's client tree —
anything held in `useFormState` would be gone before it rendered.

### 4. Burn rate forecast

Ordinary least-squares fit of end-of-month balance against month index, using **completed
months only** — a month that is three days old would otherwise drag the slope toward zero.
The projection is anchored at the current actual balance so the trend line meets the real
data, and it stops at the zero crossing rather than flatlining along the axis.

Labelled honestly as **توقع اتجاهي** (a trend-based forecast). The copy explicitly states
it is not an ML model and not a guarantee. The `N=` figure in the panel shows the sample
size the fit used.

Seeded data yields ≈ **4,160 SAR** balance, ≈ **982 SAR/month** burn, ≈ **4.2 months**
runway. Under three months flips the stat and a page-level banner to the accent colour.

**On the numbers:** these are deliberately student-club scale, not startup scale — a
6,000 SAR annual deanship allocation, a roster of 16 paying members in the spring term
growing to 22 in the autumn at 25 SAR each, and expense lines that are mostly catering,
printing and small tool subscriptions.

Two details that make the shape read as a real club rather than generated filler:

- **Dues are collected once per semester, not monthly** — a lump at the start of term
  with a few stragglers trailing in, then nothing until the next term opens. There is no
  dues line at all from May through August.
- **June–August is the Saudi summer break**, so those months are quiet on both sides of
  the ledger. That trough, and the September recovery when the new term's allocation
  lands, is what gives the burn chart its actual shape.

The simulated bank feed inserts petty-cash amounts (25–400 SAR) for the same reason: on
a vault holding a few thousand riyals, larger synthetic movements would visibly distort
the burn trend within minutes of leaving the panel open. Dues arriving through the feed
round to 25 SAR so the amount is always a whole number of members.

---

## Data model

```
vaults          id, name, org, total_funds
users           id, email, password_hash, display_name, role
stakeholders    id, vault_id → vaults, name, role, split_percentage, created_at
transactions    id, vault_id → vaults, reference, type, amount, description,
                account, timestamp, sync_status
audit_log       id, vault_id → vaults, actor, action, change_description,
                field, old_value, new_value, timestamp
disbursements   id, vault_id → vaults, amount, note, actor, timestamp
```

Schema and seeding live in `src/lib/db.ts`; `CHECK` constraints enforce the enums
(`inflow`/`outflow`, the four sync statuses, `0 ≤ split_percentage ≤ 100`).

Single-club scope for the MVP: one vault, id `1`.

---

## Auth

Auth.js v5 with a credentials provider and JWT sessions (8 hour expiry). Passwords are
bcrypt-hashed at seed time. Sign-in compares against a dummy hash when the account does
not exist, so a missing account and a wrong password take the same time.

The config is split deliberately:

- `src/auth.config.ts` — edge-safe, no database. This is what `middleware.ts` imports,
  which is what keeps `better-sqlite3` out of the edge bundle.
- `src/auth.ts` — the full config including the provider that queries SQLite.

Middleware guards every route except `/login`, `/api/*` and static assets.

---

## Hosting

### What this app needs from a host

Three requirements rule out most of the obvious choices:

1. **A long-running Node process**, not serverless functions — `better-sqlite3` is a
   native module and the app opens one connection for the process lifetime.
2. **A writable filesystem**, even an ephemeral one, so the database can be created and
   seeded at boot.
3. **A consistent instance** — all requests must hit the same filesystem, or writes made
   by one request are invisible to the next.

> **Do not deploy this to Vercel.** It is the obvious choice for Next.js and the wrong
> one here. Vercel functions get a read-only filesystem apart from `/tmp`, and each
> instance has its own `/tmp` with no shared state — so adding a stakeholder would appear
> to work, then silently revert on the next request. Vercel's own guidance is to bundle
> SQLite read-only or move writes to an external database. Netlify has the same shape.
> Cloudflare Workers cannot load a native module at all.

### Recommended: Render free tier

`render.yaml` is already written, so this is the shortest path.

1. Push this repo to GitHub.
2. On Render: **New → Blueprint**, select the repository.
3. Render reads `render.yaml`, provisions a free web service and generates `AUTH_SECRET`
   for you.
4. Deploy. First boot creates and seeds the database.

**Two catches, both free-tier behaviour rather than bugs:**

- **It sleeps.** Free services spin down after 15 minutes of inactivity and take roughly
  a minute to wake. If you are demoing live, open the URL a couple of minutes beforehand.
  An external uptime pinger every ~10 minutes prevents the sleep, but a month is ~744
  hours against a 750 hour/month allowance, so that consumes essentially all of it and
  leaves no room for a second service.
- **Data resets.** No persistent disk on free, so every deploy, restart and cold start
  reseeds from `data/seed.json`. Edits made during a demo do not survive a sleep. This is
  intentional for a demo build — see the `disk:` block at the bottom of `render.yaml` to
  make it durable on a paid instance.

### If you want the data to actually persist, for free

**Oracle Cloud Always Free** is the only genuinely free-forever option with an always-on
VM and a real disk. Build the container and run it with a mounted volume:

```bash
docker build -t monolith .
docker run -d -p 80:3000 -v monolith-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 32)" monolith
```

It costs setup time instead of money — you provision and secure a VM yourself — and
Ampere A1 capacity is frequently unavailable in popular regions. The always-free ARM
allowance also halved (to 2 OCPU / 12 GB) in June 2026, which is still far more than this
app needs.

**Turso** is the other route: it is SQLite over the wire, so the vault would persist on a
free hosted database and Vercel would become viable. That is a code change — swapping
`better-sqlite3` for `@libsql/client` in `src/lib/db.ts` — not a config change. The
repository is structured for it (all SQL lives in `src/lib/repo.ts`), but it has not been
done.

### Closed since this was written

**Koyeb**'s free tier stopped accepting new signups after the Mistral acquisition in
February 2026. **Fly.io** ended its free tier for new accounts; new signups get a short
trial, then pay-as-you-go.

### Any container host

A `Dockerfile` is included, so Google Cloud Run, a plain VPS, or Render's Docker runtime
all work. Mount a volume at `/data` to persist the vault; without one it reseeds on every
boot. `AUTH_SECRET` is the only required environment variable.

**On persistence:** the free plan cannot mount disks, so `DATABASE_PATH` points at `/tmp`
and the vault **reseeds on every deploy, restart, and cold start** — any stakeholder edits
or disbursements made during a demo are lost when the instance spins down. That is the
intended behaviour for a demo build.

To make it durable, move to a paid instance type and uncomment the `disk:` block at the
bottom of `render.yaml` (1GB mounted at `/data`, with `DATABASE_PATH=/data/monolith.db`).
The seed then runs only on the very first boot.

### Deploying manually instead

```bash
npm ci && npm run build
AUTH_SECRET=... DATABASE_PATH=/tmp/monolith.db npm run start
```

Any Node 20+ host works. `AUTH_SECRET` is the only required variable.

---

## Project layout

```
data/seed.json              Generated demo data — the single source of seed truth
scripts/generate-seed.mjs   Deterministic generator; prints derived burn figures
src/app/                    Routes: /, /login, /ledger, /bank, /burn, /api/*
src/app/actions/            Server actions (session, ledger mutations)
src/components/ui/          Design system: Panel, DataRow, Stat, StatusPill,
                            Button, Field, ShareBar, EmptyState
src/lib/domain.ts           Types + pure calculations (splits, allocation, burn fit)
src/lib/repo.ts             All SQL. Nothing else touches better-sqlite3.
src/lib/db.ts               Schema, connection, boot-time seeding
src/lib/format.ts           All number/date/currency formatting
src/lib/i18n/               Dictionary
```

`domain.ts` is deliberately free of React and SQL — the same functions run against the
seed file, against database rows, and in tests.
