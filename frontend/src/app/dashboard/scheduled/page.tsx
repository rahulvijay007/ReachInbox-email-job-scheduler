"use client";

import { EmailTable } from "@/components/emails/EmailTable";
import { api } from "@/lib/api";

export default function ScheduledPage() {
  return <EmailTable mode="scheduled" fetcher={(page, limit) => api.emails.scheduled(page, limit)} />;
}
