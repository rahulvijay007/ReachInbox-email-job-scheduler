"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

const QUICK_PICKS = [
  { label: "Tomorrow", hours: 9, minutes: 0, dayOffset: 1 },
  { label: "Tomorrow, 10:00 AM", hours: 10, minutes: 0, dayOffset: 1 },
  { label: "Tomorrow, 11:00 AM", hours: 11, minutes: 0, dayOffset: 1 },
  { label: "Tomorrow, 3:00 PM", hours: 15, minutes: 0, dayOffset: 1 },
];

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function SendLaterPopover({
  value,
  onChange,
  onCancel,
  onDone,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [local, setLocal] = useState(value);

  const pick = (dayOffset: number, hours: number, minutes: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    setLocal(d);
    onChange(d);
  };

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Send Later</h3>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs text-gray-400">Pick date &amp; time</span>
        <input
          type="datetime-local"
          value={toLocalInputValue(local)}
          onChange={(e) => {
            const d = new Date(e.target.value);
            setLocal(d);
            onChange(d);
          }}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="mb-4 space-y-1">
        {QUICK_PICKS.map((qp) => (
          <button
            key={qp.label}
            type="button"
            onClick={() => pick(qp.dayOffset, qp.hours, qp.minutes)}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="outline" onClick={onDone} type="button">
          Done
        </Button>
      </div>
    </div>
  );
}
