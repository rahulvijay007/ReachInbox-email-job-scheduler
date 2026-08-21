import { Queue } from "bullmq";
import { env } from "../config/env";
import { redisConnection } from "./connection";

export interface EmailJobPayload {
  emailJobId: string; // == Prisma EmailJob.id, and doubles as the BullMQ jobId
}

/**
 * The single BullMQ queue used for all scheduled sends. No cron anywhere —
 * every send is a BullMQ *delayed job* whose delay is computed from
 * (scheduledAt - now) at enqueue time, and recomputed via moveToDelayed()
 * when the rate limiter defers it (see worker/processor.ts).
 */
export const emailQueue = new Queue<EmailJobPayload>(env.QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    // Postgres is the durable source of truth (see EmailJob model), so we
    // don't need Redis to retain finished jobs forever.
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600, count: 5000 },
  },
});
