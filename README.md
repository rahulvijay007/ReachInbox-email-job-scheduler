# ReachInbox — Email Job Scheduler

A production-grade slice of ReachInbox's send infrastructure: schedule cold
emails to go out at a specific time, at scale, with configurable concurrency,
per-sender throttling, and an hourly rate cap — all backed by **BullMQ +
Redis** (no cron, anywhere) and a **Postgres** record of truth, plus a
Next.js dashboard with real Google OAuth.

```
Outbox AI/
├── backend/     Express + TypeScript API, BullMQ worker, Prisma/Postgres
├── frontend/    Next.js (App Router) + TypeScript + Tailwind dashboard
├── docker-compose.yml   Postgres + Redis for local dev
└── Figma/       Reference screenshots the UI was built against
```

---

## 1. Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres + Redis) — or run your own local instances
- A Google Cloud OAuth 2.0 Client ID (see §4)

---

## 2. Running the backend

```bash
cd backend
cp .env.example .env        # then fill in GOOGLE_CLIENT_ID/SECRET, JWT_SECRET
npm install

# start Postgres + Redis (from the repo root)
cd .. && docker compose up -d

cd backend
npx prisma migrate dev --name init   # creates tables
npm run dev                          # HTTP API on :4000

# in a SECOND terminal — the worker is a separate process on purpose,
# so it can be restarted/killed independently of the API (see §5):
npm run worker
```

Both processes read the same `.env`. `npm run dev` never sends an email by
itself — only `npm run worker` pulls jobs off the queue and actually talks
to Ethereal SMTP.

## 3. Running the frontend

```bash
cd frontend
cp .env.example .env.local   # fill in NEXTAUTH_SECRET + Google creds
npm install
npm run dev                  # http://localhost:3000
```

## 4. Google OAuth setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
3. Put the Client ID/Secret in **both** `backend/.env` and `frontend/.env.local` (the frontend runs the OAuth handshake via NextAuth; the backend independently re-verifies the resulting Google ID token with `google-auth-library` before trusting it — no client-side-only auth).

## 5. Ethereal Email setup

Nothing to configure manually — every "sender" in the app is a **freshly
provisioned Ethereal test account** (`nodemailer.createTestAccount()`),
created automatically the first time a user logs in (`ensureDefaultSender`)
or via `POST /api/senders`. To *view* a sent email:
- The worker logs each send's Ethereal preview URL, and
- the dashboard's Sent-email detail drawer shows a **"View in Ethereal
  inbox →"** link (`nodemailer.getTestMessageUrl`).

---

## 6. Architecture overview

### Scheduling (no cron, anywhere)

`POST /api/emails/schedule` writes one `Batch` + one `EmailJob` row per
recipient to Postgres (the durable source of truth), staggers each
recipient's `scheduledAt` by its position × "delay between 2 emails", then
bulk-adds matching **BullMQ delayed jobs** (`queue.addBulk`, `delay =
scheduledAt - now`, `jobId = EmailJob.id`). BullMQ's delayed-job mechanism —
backed by a Redis sorted set — *is* the scheduler; there is no `node-cron`,
`agenda`, or OS cron involved anywhere in this repo.

### Persistence across restarts

Two layers:
1. **Normal restarts (Node process only).** Redis is a separate, persistent
   process (Docker volume, `--appendonly yes`). Restarting `npm run dev` or
   `npm run worker` never touches Redis's delayed-job set — pending sends
   fire at their original time regardless.
2. **Defensive recovery (Redis data loss).** On `worker.ts` boot,
   `reconcileOnStartup()` (`backend/src/worker/reconcile.ts`) reads every
   Postgres `EmailJob` still in `SCHEDULED`/`RESCHEDULED` state and
   re-`add()`s it to BullMQ with `jobId = EmailJob.id`. Because BullMQ dedups
   on `jobId`, this function is safe to run on *every* boot — a no-op if
   Redis still has the job, a real recovery if it doesn't.
3. **Crash mid-send recovery.** If a worker dies after claiming a job
   (`status = SENDING`) but before it finishes, that row would otherwise be
   stuck forever — the processor's conditional claim only picks up
   `SCHEDULED`/`RESCHEDULED` rows. `reconcileOnStartup()` also resets any
   `SENDING` row older than 5 minutes back to `SCHEDULED` before replaying
   it. This favors "at least once" delivery (a small chance of a duplicate
   send if the original attempt actually completed a moment before the
   crash) over silently losing the send — the standard trade-off for this
   class of system. I caught this exact gap (along with a worker lock-token
   bug in the `moveToDelayed`/`moveToFinished` calls) by stress-testing with
   the load-test script (`npm run loadtest`) before finalizing this.

### Idempotency (never sent twice)

1. **BullMQ jobId dedup** — the same `EmailJob.id` is always used as the
   BullMQ `jobId`, so re-adding it (e.g. during reconciliation) is a no-op.
2. **Conditional DB claim** — the processor does
   `UPDATE "EmailJob" SET status='SENDING' WHERE id=$1 AND status IN ('SCHEDULED','RESCHEDULED')`;
   0 rows updated means another attempt already owns it, so it's skipped.
   This is what makes **concurrent workers** (and multiple worker
   instances) safe.
3. **Final short-circuit** — if a job somehow gets delivered to the
   processor after the row is already `SENT`, it returns immediately.

### Concurrency, delay & rate limiting

- **Concurrency**: `WORKER_CONCURRENCY` (env, default `5`) configures
  `new Worker(queueName, processor, { concurrency })`. The processor is
  written to be safe under parallel execution — every state transition goes
  through the conditional DB update above, and rate-limit accounting goes
  through a single atomic Redis Lua script (below), so two concurrently
  running jobs can never both "win" the same slot.
- **Minimum delay between sends**: enforced **per sender**, not globally —
  a Redis key tracks each sender's last-send timestamp; `MIN_DELAY_BETWEEN_EMAILS_MS`
  (env, default `2000` — i.e. **min 2 seconds between sends from the same
  sender**) is the configurable floor.
- **Hourly limit**: a Redis counter keyed `ratelimit:hour:<senderId>:<hourBucket>`,
  capped at `MAX_EMAILS_PER_HOUR_PER_SENDER` (env, default `100`), overridable
  per batch from the compose form's "Hourly Limit" field.
- **Atomicity**: both checks run inside **one Redis `EVAL` (Lua script)**
  (`backend/src/rateLimit/senderRateLimiter.ts`) — Lua scripts execute
  atomically in Redis, so this is safe across multiple worker processes/
  machines, not just multiple threads. No in-memory-only counters anywhere.
- **On limit hit → reschedule, never drop**: the script returns how many ms
  to wait; the worker calls `job.moveToDelayed(now + waitMs, token)` and
  flips the DB row to `RESCHEDULED` (bumping `rescheduleCount`) instead of
  failing it. When the *hourly* cap is what's hit, the wait is computed as
  "next hour boundary + (this job's position among this hour's overflow ×
  min delay)" — so a burst of deferred jobs is spread out rather than all
  re-firing in the same instant, and relative order is preserved as closely
  as possible.
- **Behavior under 1000+ emails at once**: DB rows are `createMany`'d and
  BullMQ jobs are `addBulk`'d in one shot — enqueueing a burst is O(1) Redis
  round trips, not O(n). All 1000 jobs can share the same initial delay; the
  Lua-script gate at **processing time** (not enqueue time) is what actually
  throttles them — Redis's delayed-job set is effectively absorbing the
  burst and re-releasing it at the allowed rate. See
  `backend/scripts/loadtest.ts` (`npm run loadtest`) to see this live.
- **Trade-off note**: this hand-rolled Redis/Lua limiter was chosen over
  BullMQ Pro's native per-group rate limiter (a paid feature) so the
  solution stays free/open-source while remaining atomic and safe across
  multiple worker instances. The cost is a small amount of custom script to
  maintain instead of a built-in.

---

## 7. Feature checklist

**Backend**
- [x] Schedule API (`POST /api/emails/schedule`) — persists to Postgres, enqueues BullMQ delayed jobs
- [x] BullMQ delayed jobs, no cron anywhere
- [x] Multi-sender support via Ethereal (`Sender` model, auto-provisioned)
- [x] Survives restarts (Redis durability + boot-time reconciliation)
- [x] Idempotent sends (jobId dedup + conditional DB claim + SENT short-circuit)
- [x] Configurable worker concurrency (`WORKER_CONCURRENCY`)
- [x] Configurable min delay between sends (`MIN_DELAY_BETWEEN_EMAILS_MS`)
- [x] Configurable, per-sender hourly rate limit (`MAX_EMAILS_PER_HOUR_PER_SENDER`, per-batch override)
- [x] Redis-backed atomic rate limiter (multi-worker safe), reschedule-not-drop behavior
- [x] Load-test script for 1000+ emails at the same start time

**Frontend**
- [x] Real Google OAuth login (NextAuth + backend-side ID token verification)
- [x] Header/profile card: name, email, avatar, logout
- [x] Dashboard with Scheduled / Sent tabs + Compose button
- [x] Compose modal: subject, body, CSV/text lead upload with detected-count, start time (Send Later popover), delay-between-emails, hourly limit
- [x] Scheduled table: recipient, subject, scheduled time, status — loading + empty states
- [x] Sent table: recipient, subject, sent time, status (sent/failed) — loading + empty states
- [x] Reusable UI primitives (Button, Input, Modal, Drawer, Badge, Avatar, Toast, EmptyState, Skeleton)
- [x] Typed API layer (`lib/types.ts`, `lib/api.ts`) — no `any` on API responses
- [x] Toast-based error handling

---

## 8. Assumptions, shortcuts & trade-offs

- **Figma fidelity**: I worked from exported screenshots of the Figma frames
  (`Figma/`) rather than live-inspecting the Figma file, so this is close
  but not pixel-perfect.
- **"Top header"**: I placed the name/email/avatar/logout in a sidebar
  profile card rather than a full-width top bar, matching where the Figma
  frames actually put that information.
- **Login is Google-only**: the login screen also shows email/password
  fields for visual fidelity with the design, but they're disabled — only
  Google OAuth is wired up, per the requirements.
- **Rich text editor**: the compose body uses a lightweight
  `contentEditable` + `document.execCommand` toolbar rather than pulling in
  a full WYSIWYG dependency — enough to match the Figma toolbar without the
  extra weight.
- **Ethereal, not a real SMTP provider** — intentional, for safe testing.
- **Google OAuth credentials are not committed** — set your own
  `GOOGLE_CLIENT_ID`/`SECRET` in `backend/.env` and `frontend/.env.local`
  (see §4) before running this.
