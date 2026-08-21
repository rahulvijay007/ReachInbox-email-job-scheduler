/**
 * Schedules 1000+ dummy emails for ~the same start time, straight through
 * scheduleEmails() (bypassing HTTP), to demonstrate that:
 *   - enqueueing a large burst is cheap (bulk insert + addBulk)
 *   - the worker's rate limiter spreads/throttles delivery instead of
 *     firing everything at once or dropping jobs once the hourly cap hits
 *
 * Usage: npm run loadtest -- --count=1000 --user=<userId> --sender=<senderId>
 * If --user/--sender are omitted, the script creates a throwaway user +
 * Ethereal sender for the run.
 */
import { prisma } from "../src/db/prisma";
import { scheduleEmails } from "../src/emails/scheduleService";
import { ensureDefaultSender } from "../src/senders/senderService";

function arg(name: string, fallback?: string) {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=")[1] : fallback;
}

async function main() {
  const count = Number(arg("count", "1000"));
  let userId = arg("user");
  let senderId = arg("sender");

  if (!userId) {
    const user = await prisma.user.upsert({
      where: { googleId: "loadtest-user" },
      update: {},
      create: { googleId: "loadtest-user", email: "loadtest@example.com", name: "Load Test User" },
    });
    userId = user.id;
  }

  if (!senderId) {
    const sender = await ensureDefaultSender(userId);
    senderId = sender.id;
  }

  const recipients = Array.from({ length: count }, (_, i) => `lead${i}@example.com`);

  console.log(`Scheduling ${recipients.length} emails for ~now via user=${userId} sender=${senderId}...`);

  const result = await scheduleEmails({
    userId,
    senderId,
    recipients,
    subject: "Load test — same start time",
    body: "<p>This is a load-test email.</p>",
    startTime: new Date(),
    delayBetweenEmailsSec: 0, // all targeting ~the same instant on purpose
    hourlyLimit: 100,
  });

  console.log("Done:", result);
  console.log("Start the worker (npm run worker) and watch it throttle/reschedule sends via the rate limiter.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
