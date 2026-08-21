import nodemailer, { Transporter } from "nodemailer";
import type { Sender } from "@prisma/client";

const cache = new Map<string, Transporter>();

/** One SMTP transporter per sender, reused across sends (cheap, avoids reconnect overhead per email). */
export function getTransportForSender(sender: Sender): Transporter {
  const cached = cache.get(sender.id);
  if (cached) return cached;

  const transport = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false, // Ethereal uses STARTTLS on 587
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });

  cache.set(sender.id, transport);
  return transport;
}
