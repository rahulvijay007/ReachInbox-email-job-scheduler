import { prisma } from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";

// A job claimed (status=SENDING) longer ago than this, with no terminal
// status, is treated as orphaned by a worker that crashed mid-send rather
// than one that's merely still in flight.
const STALE_SENDING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Runs once at worker boot. Re-adds any EmailJob that's still in a
 * schedulable state (SCHEDULED/RESCHEDULED) to BullMQ with jobId =
 * EmailJob.id and delay = max(0, scheduledAt - now).
 *
 * This is the defensive half of "persists across restarts": normal Node
 * process restarts don't need this at all (BullMQ's delayed jobs already
 * live safely in Redis, independent of the Express/worker process). This
 * exists to recover from the harsher case of Redis itself losing its data
 * (e.g. the volume was wiped) — in that scenario the delayed job set is
 * gone, but Postgres (the source of truth) still knows what's pending, so
 * we simply replay it back into Redis. Because BullMQ dedups by jobId, this
 * function is always safe to run on every boot: it's a no-op for anything
 * already present in Redis and a real recovery for anything missing.
 *
 * It also recovers jobs orphaned mid-send: if a worker crashes after
 * claiming a job (status flipped to SENDING) but before it finishes, that
 * row would otherwise be stuck forever — the processor's conditional claim
 * only picks up SCHEDULED/RESCHEDULED rows, so a plain re-add would be
 * silently ignored. Any SENDING row older than the staleness threshold is
 * reset to SCHEDULED before replaying, so it gets picked up again. This
 * favors "at least once" delivery (a theoretical, rare double-send if the
 * original attempt actually completed just before the crash) over
 * "at most once" (silently losing the send) — the standard trade-off for
 * this class of system, and documented in the README.
 */
export async function reconcileOnStartup(): Promise<void> {
  const staleCutoff = new Date(Date.now() - STALE_SENDING_THRESHOLD_MS);
  const orphaned = await prisma.emailJob.updateMany({
    where: { status: "SENDING", updatedAt: { lt: staleCutoff } },
    data: { status: "SCHEDULED" },
  });
  if (orphaned.count > 0) {
    console.log(`🔁 Reconciliation: recovered ${orphaned.count} orphaned in-flight job(s).`);
  }

  const pending = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "RESCHEDULED"] } },
    orderBy: { sequence: "asc" },
  });

  if (pending.length === 0) {
    console.log("🔁 Reconciliation: no pending jobs to replay.");
    return;
  }

  const now = Date.now();
  await emailQueue.addBulk(
    pending.map((job) => ({
      name: "send-email",
      data: { emailJobId: job.id },
      opts: {
        jobId: job.id,
        delay: Math.max(0, job.scheduledAt.getTime() - now),
      },
    }))
  );

  console.log(`🔁 Reconciliation: replayed ${pending.length} pending job(s) into BullMQ.`);
}
