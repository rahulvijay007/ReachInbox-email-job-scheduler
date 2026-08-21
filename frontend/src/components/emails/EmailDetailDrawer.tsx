"use client";

import { useEffect, useState } from "react";
import { Drawer, Avatar, Badge } from "@/components/ui";
import { api } from "@/lib/api";
import type { EmailJob } from "@/lib/types";
import { formatFullDate } from "@/lib/format";

export function EmailDetailDrawer({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const [job, setJob] = useState<(EmailJob & { sender: { email: string; label: string } }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    setLoading(true);
    api.emails
      .get(jobId)
      .then((r) => setJob(r.job))
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <Drawer open={!!jobId} onClose={onClose}>
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <button onClick={onClose} className="mb-4 self-end text-gray-400 hover:text-gray-600" aria-label="Close">
          ✕
        </button>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {job && (
          <>
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={job.sender.label} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {job.sender.label} <span className="font-normal text-gray-400">&lt;{job.sender.email}&gt;</span>
                  </p>
                  <p className="text-xs text-gray-400">to {job.recipientEmail}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {formatFullDate(job.sentAt ?? job.scheduledAt)}
              </span>
            </div>

            <h2 className="mb-2 text-lg font-semibold text-gray-900">{job.subject}</h2>

            <div className="mb-4">
              <Badge tone={job.status === "SENT" ? "gray" : job.status === "FAILED" ? "red" : "orange"}>
                {job.status}
              </Badge>
            </div>

            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: job.body }} />

            {job.previewUrl && (
              <a
                href={job.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View in Ethereal inbox →
              </a>
            )}

            {job.lastError && <p className="mt-4 text-sm text-red-600">Last error: {job.lastError}</p>}
          </>
        )}
      </div>
    </Drawer>
  );
}
