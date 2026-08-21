"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { RichTextToolbar } from "./RichTextToolbar";
import { SendLaterPopover } from "./SendLaterPopover";
import { api, ApiRequestError } from "@/lib/api";
import type { Sender } from "@/lib/types";
import { parseLeadsFile } from "@/lib/csv";
import { useEmailsVersion } from "@/lib/EmailsContext";

type Mode = "single" | "upload";

const DEFAULT_START_MINUTES_FROM_NOW = 5;

export function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { success, error } = useToast();
  const { notifyChanged } = useEmailsVersion();
  const bodyRef = useRef<HTMLDivElement>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [mode, setMode] = useState<Mode>("single");
  const [to, setTo] = useState("");
  const [uploadedEmails, setUploadedEmails] = useState<string[]>([]);
  const [uploadInvalidCount, setUploadInvalidCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [subject, setSubject] = useState("");
  const [delaySec, setDelaySec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [startTime, setStartTime] = useState<Date>(
    () => new Date(Date.now() + DEFAULT_START_MINUTES_FROM_NOW * 60 * 1000)
  );
  const [showSendLater, setShowSendLater] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.senders
      .list()
      .then(({ senders: list, defaults }) => {
        setSenders(list);
        setSenderId((prev) => prev || list[0]?.id || "");
        setDelaySec(Math.max(1, Math.round(defaults.minDelayMs / 1000)));
        setHourlyLimit(defaults.hourlyLimit);
      })
      .catch(() => error("Could not load senders"));
  }, [open, error]);

  useEffect(() => {
    if (open) return;
    // reset on close
    setMode("single");
    setTo("");
    setUploadedEmails([]);
    setUploadInvalidCount(0);
    setFileName("");
    setSubject("");
    setShowSendLater(false);
    if (bodyRef.current) bodyRef.current.innerHTML = "";
  }, [open]);

  const recipients = mode === "single" ? to.split(",").map((s) => s.trim()).filter(Boolean) : uploadedEmails;

  async function handleFile(file: File) {
    const text = await file.text();
    const { emails, invalidCount } = await parseLeadsFile(text);
    setUploadedEmails(emails);
    setUploadInvalidCount(invalidCount);
    setFileName(file.name);
    setMode("upload");
  }

  async function submitSchedule() {
    if (!senderId) return error("Select a sender first");
    if (recipients.length === 0) return error("Add at least one recipient");
    if (!subject.trim()) return error("Subject is required");

    setSubmitting(true);
    try {
      const bodyHtml = bodyRef.current?.innerHTML ?? "";
      const result = await api.emails.schedule({
        senderId,
        recipients,
        subject,
        body: bodyHtml,
        startTime: startTime.toISOString(),
        delayBetweenEmailsSec: delaySec,
        hourlyLimit,
      });
      success(`Scheduled ${result.scheduledCount} email${result.scheduledCount === 1 ? "" : "s"}`);
      notifyChanged();
      setShowSendLater(false);
      onClose();
    } catch (err) {
      error(err instanceof ApiRequestError ? err.message : "Failed to schedule emails");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-2xl">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Compose New Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm text-gray-500">From</span>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm text-gray-500">To</span>
            {mode === "single" ? (
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full rounded-xl border-0 bg-transparent px-1 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none"
              />
            ) : (
              <div className="flex-1 text-sm text-gray-600">
                {fileName ? (
                  <>
                    <span className="font-medium text-gray-800">{uploadedEmails.length}</span> email address
                    {uploadedEmails.length === 1 ? "" : "es"} detected from <span className="italic">{fileName}</span>
                    {uploadInvalidCount > 0 && (
                      <span className="ml-2 text-amber-600">({uploadInvalidCount} invalid rows skipped)</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">No file uploaded yet</span>
                )}
              </div>
            )}

            <label className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
              <span className="inline-flex items-center gap-1">↑ Upload List</span>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
          {mode === "upload" && (
            <button
              type="button"
              onClick={() => setMode("single")}
              className="ml-16 text-xs text-gray-400 hover:text-gray-600"
            >
              ← switch back to a single recipient
            </button>
          )}

          <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <span className="w-16 shrink-0 text-sm text-gray-500">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border-0 bg-transparent px-1 py-2 text-sm placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Delay between 2 emails (sec)
              <input
                type="number"
                min={0}
                value={delaySec}
                onChange={(e) => setDelaySec(Number(e.target.value))}
                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Hourly Limit
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100">
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Type your message..."
              className="min-h-[160px] max-h-[280px] overflow-y-auto bg-gray-50 px-4 py-3 text-sm focus:outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
            />
            <RichTextToolbar targetRef={bodyRef} />
          </div>
        </div>

        <div className="relative mt-6 flex justify-end">
          <Button variant="outline" onClick={() => setShowSendLater((v) => !v)} type="button">
            {mode === "upload" ? "Schedule to List" : "Schedule"} — {startTime.toLocaleString()}
          </Button>

          {showSendLater && (
            <SendLaterPopover
              value={startTime}
              onChange={setStartTime}
              onCancel={() => setShowSendLater(false)}
              onDone={submitSchedule}
            />
          )}
        </div>
        {submitting && <p className="mt-2 text-right text-xs text-gray-400">Scheduling…</p>}
      </div>
    </Modal>
  );
}
