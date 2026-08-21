import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

const SCHEDULED_STATUSES: Prisma.EmailJobWhereInput["status"] = {
  in: ["PENDING", "SCHEDULED", "SENDING", "RESCHEDULED"],
};
const SENT_STATUSES: Prisma.EmailJobWhereInput["status"] = { in: ["SENT", "FAILED"] };

export async function listScheduledEmails(userId: string, page: number, limit: number) {
  const where: Prisma.EmailJobWhereInput = { batch: { userId }, status: SCHEDULED_STATUSES };
  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailJob.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function listSentEmails(userId: string, page: number, limit: number) {
  const where: Prisma.EmailJobWhereInput = { batch: { userId }, status: SENT_STATUSES };
  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailJob.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getEmailJob(userId: string, id: string) {
  return prisma.emailJob.findFirst({
    where: { id, batch: { userId } },
    include: { sender: { select: { email: true, label: true } } },
  });
}
