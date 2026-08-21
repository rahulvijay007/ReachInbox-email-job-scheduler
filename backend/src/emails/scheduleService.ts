import { prisma } from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";
import { ApiError } from "../middleware/errorHandler";

export interface ScheduleEmailsInput {
  userId: string;
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: Date;
  delayBetweenEmailsSec: number;
  hourlyLimit: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates one Batch + one EmailJob row per recipient (source of truth in
 * Postgres), then bulk-adds matching BullMQ *delayed* jobs — no cron
 * anywhere. Each EmailJob.id is reused as the BullMQ jobId, which is the
 * core idempotency guarantee: re-adding the same id is a no-op in BullMQ.
 */
export async function scheduleEmails(input: ScheduleEmailsInput) {
  const sender = await prisma.sender.findFirst({
    where: { id: input.senderId, userId: input.userId },
  });
  if (!sender) throw new ApiError(404, "Sender not found");

  const recipients = Array.from(
    new Set(input.recipients.map((r) => r.trim().toLowerCase()).filter((r) => r.length > 0))
  );
  const validRecipients = recipients.filter((r) => EMAIL_RE.test(r));

  if (validRecipients.length === 0) {
    throw new ApiError(400, "No valid recipient email addresses provided");
  }

  const batch = await prisma.batch.create({
    data: {
      userId: input.userId,
      senderId: input.senderId,
      subject: input.subject,
      body: input.body,
      startTime: input.startTime,
      delayBetweenEmailsSec: input.delayBetweenEmailsSec,
      hourlyLimit: input.hourlyLimit,
      totalRecipients: validRecipients.length,
    },
  });

  // Stagger each recipient's target send time by its position in the batch,
  // matching the "Delay between 2 emails" setting from the compose form.
  // (Actual enforcement/throttling still happens atomically in the worker
  // via the Redis rate limiter — this stagger just gives a sane initial
  // ordering so a burst of jobs doesn't all target the exact same instant.)
  const jobsData = validRecipients.map((recipientEmail, index) => ({
    batchId: batch.id,
    senderId: input.senderId,
    recipientEmail,
    subject: input.subject,
    body: input.body,
    sequence: index,
    scheduledAt: new Date(input.startTime.getTime() + index * input.delayBetweenEmailsSec * 1000),
    status: "SCHEDULED" as const,
  }));

  await prisma.emailJob.createMany({ data: jobsData });

  const createdJobs = await prisma.emailJob.findMany({
    where: { batchId: batch.id },
    orderBy: { sequence: "asc" },
  });

  const now = Date.now();
  await emailQueue.addBulk(
    createdJobs.map((job) => ({
      name: "send-email",
      data: { emailJobId: job.id },
      opts: {
        jobId: job.id, // idempotency: BullMQ dedups on this
        delay: Math.max(0, job.scheduledAt.getTime() - now),
      },
    }))
  );

  return { batchId: batch.id, scheduledCount: createdJobs.length };
}
