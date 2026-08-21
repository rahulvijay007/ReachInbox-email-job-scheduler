import nodemailer from "nodemailer";
import { Job } from "bullmq";
import { prisma } from "../db/prisma";
import { EmailJobPayload } from "../queue/emailQueue";
import { checkSenderRateLimit } from "../rateLimit/senderRateLimiter";
import { getTransportForSender } from "./transport";
import { env } from "../config/env";

/**
 * BullMQ processor — this is where every "no cron" guarantee actually
 * lives. Called once per delayed job when its delay elapses (or once it's
 * re-delayed by the rate limiter via moveToDelayed).
 */
export async function processEmailJob(job: Job<EmailJobPayload>, token?: string): Promise<void> {
  const { emailJobId } = job.data;

  const existing = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true, batch: true },
  });

  // Row missing or already sent (e.g. this is a stale/duplicate delivery of
  // the same jobId after a Redis-loss reconciliation) -> idempotent no-op.
  if (!existing || existing.status === "SENT") {
    return;
  }

  // Atomically claim the job: only proceed if it's still in a claimable
  // state. If 0 rows are affected, some other worker/attempt already has
  // it — skip, avoiding duplicate sends under concurrency.
  const claim = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: { in: ["SCHEDULED", "RESCHEDULED"] } },
    data: { status: "SENDING" },
  });
  if (claim.count === 0) {
    return;
  }

  const minDelayMs = env.MIN_DELAY_BETWEEN_EMAILS_MS;
  const hourlyLimit = existing.batch.hourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;

  const rateLimit = await checkSenderRateLimit({
    senderId: existing.senderId,
    minDelayMs,
    hourlyLimit,
  });

  if (!rateLimit.allowed) {
    // Don't drop or fail the job — push it to the next available slot and
    // put the DB row back into a schedulable state.
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "RESCHEDULED",
        rescheduleCount: { increment: 1 },
        scheduledAt: new Date(Date.now() + rateLimit.waitMs),
      },
    });
    await job.moveToDelayed(Date.now() + rateLimit.waitMs, token);
    return;
  }

  try {
    const transport = getTransportForSender(existing.sender);
    const info = await transport.sendMail({
      from: `"${existing.sender.label}" <${existing.sender.email}>`,
      to: existing.recipientEmail,
      subject: existing.subject,
      html: existing.body,
    });

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        previewUrl: nodemailer.getTestMessageUrl(info) || null,
        attempts: { increment: 1 },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Put it back into a retryable state so a subsequent BullMQ attempt can
    // re-claim it; the worker's "failed" listener marks it FAILED once
    // BullMQ's own attempts are exhausted (see worker/index.ts).
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "SCHEDULED", lastError: message, attempts: { increment: 1 } },
    });
    throw err;
  }
}
