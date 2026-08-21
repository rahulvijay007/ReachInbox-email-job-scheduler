import { prisma } from "../db/prisma";
import { provisionEtherealAccount } from "./etherealProvisioner";

export async function listSenders(userId: string) {
  return prisma.sender.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, email: true, createdAt: true },
  });
}

export async function createSender(userId: string, label: string) {
  const account = await provisionEtherealAccount();
  return prisma.sender.create({
    data: {
      userId,
      label,
      email: account.email,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      smtpUser: account.smtpUser,
      smtpPass: account.smtpPass,
    },
    select: { id: true, label: true, email: true, createdAt: true },
  });
}

/** Called once on a user's very first login so they have at least one sender to pick from. */
export async function ensureDefaultSender(userId: string) {
  const existing = await prisma.sender.findFirst({ where: { userId } });
  if (existing) return existing;
  return createSender(userId, "Default Sender");
}
