"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState } from "@/components/ui";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmailDetailDrawer } from "./EmailDetailDrawer";
import type { EmailJob, PaginatedResult } from "@/lib/types";
import { formatPillDate, stripHtml } from "@/lib/format";
import { useEmailsVersion } from "@/lib/EmailsContext";

type Mode = "scheduled" | "sent";

const PAGE_SIZE = 20;

export function EmailTable({
  mode,
  fetcher,
}: {
  mode: Mode;
  fetcher: (page: number, limit: number) => Promise<PaginatedResult<EmailJob>>;
}) {
  const [items, setItems] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { version, notifyChanged } = useEmailsVersion();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(1, PAGE_SIZE);
      setItems(res.items);
    } catch {
      setError("Could not load emails. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const filtered = search.trim()
    ? items.filter(
        (j) =>
          j.recipientEmail.toLowerCase().includes(search.toLowerCase()) ||
          j.subject.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-50 px-4 py-2.5">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={notifyChanged}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      {loading && <SkeletonRows />}

      {!loading && error && (
        <div className="px-6 py-10 text-center text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={mode === "scheduled" ? "🗓️" : "📤"}
          title={mode === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
          description={
            mode === "scheduled"
              ? "Click Compose to schedule your first email sequence."
              : "Emails will show up here once your scheduled sends go out."
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {filtered.map((job) => (
            <li key={job.id}>
              <button
                onClick={() => setOpenJobId(job.id)}
                className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
              >
                <span className="w-40 shrink-0 truncate text-sm font-medium text-gray-900">
                  To: {job.recipientEmail}
                </span>

                {mode === "scheduled" ? (
                  <Badge tone="orange">🕐 {formatPillDate(job.scheduledAt)}</Badge>
                ) : (
                  <Badge tone={job.status === "FAILED" ? "red" : "gray"}>
                    {job.status === "FAILED" ? "Failed" : "Sent"}
                  </Badge>
                )}

                <span className="min-w-0 flex-1 truncate text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{job.subject}</span> — {stripHtml(job.body).slice(0, 80)}
                  {stripHtml(job.body).length > 80 ? "…" : ""}
                </span>

                <StarIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <EmailDetailDrawer jobId={openJobId} onClose={() => setOpenJobId(null)} />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
      <path d="M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-gray-300">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}
