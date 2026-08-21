"use client";

import { useEffect, useState } from "react";
import { ProfileCard } from "./ProfileCard";
import { NavItem } from "./NavItem";
import { Button } from "@/components/ui";
import { ComposeModal } from "@/components/compose/ComposeModal";
import { api } from "@/lib/api";
import { useEmailsVersion } from "@/lib/EmailsContext";

export function Sidebar() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [scheduledCount, setScheduledCount] = useState<number | undefined>(undefined);
  const [sentCount, setSentCount] = useState<number | undefined>(undefined);
  const { version } = useEmailsVersion();

  useEffect(() => {
    api.emails.scheduled(1, 1).then((r) => setScheduledCount(r.total)).catch(() => undefined);
    api.emails.sent(1, 1).then((r) => setSentCount(r.total)).catch(() => undefined);
  }, [version]);

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-gray-100 p-4">
      <div className="mb-6 px-1 pt-2">
        <span className="text-2xl font-black tracking-tight text-gray-900">ONB</span>
      </div>

      <ProfileCard />

      <Button className="mb-6 w-full" variant="outline" onClick={() => setComposeOpen(true)}>
        + Compose
      </Button>

      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Core</div>
      <nav className="flex flex-col gap-1">
        <NavItem href="/dashboard/scheduled" label="Scheduled" count={scheduledCount} icon={<ClockIcon />} />
        <NavItem href="/dashboard/sent" label="Sent" count={sentCount} icon={<SendIcon />} />
      </nav>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </aside>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
