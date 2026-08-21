import { Worker } from "bullmq";
import { env } from "./config/env";
import { redisConnection } from "./queue/connection";
import { processEmailJob } from "./worker/processor";
import { reconcileOnStartup } from "./worker/reconcile";
import { prisma } from "./db/prisma";

async function main() {
  await reconcileOnStartup();

  const worker = new Worker(env.QUEUE_NAME, (job, token) => processEmailJob(job, token), {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY, // configurable, safe under parallel processing (see processor.ts + senderRateLimiter.ts)
  });

  worker.on("completed", (job) => {
    console.log(`✅ job ${job.id} (email ${job.data.emailJobId}) processed`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    console.error(`❌ job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);

    const attemptsLimit = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
    if (job.attemptsMade >= attemptsLimit) {
      await prisma.emailJob.update({
        where: { id: job.data.emailJobId },
        data: { status: "FAILED", lastError: err.message },
      }).catch(() => undefined);
    }
  });

  console.log(
    `👷 ReachInbox email worker started (concurrency=${env.WORKER_CONCURRENCY}, ` +
      `minDelay=${env.MIN_DELAY_BETWEEN_EMAILS_MS}ms, defaultHourlyLimit=${env.MAX_EMAILS_PER_HOUR_PER_SENDER})`
  );

  const shutdown = async () => {
    console.log("Shutting down worker...");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
