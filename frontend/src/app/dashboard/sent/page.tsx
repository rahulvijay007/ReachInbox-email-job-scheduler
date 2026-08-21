"use client";

import { EmailTable } from "@/components/emails/EmailTable";
import { api } from "@/lib/api";

export default function SentPage() {
  return <EmailTable mode="sent" fetcher={(page, limit) => api.emails.sent(page, limit)} />;
}
