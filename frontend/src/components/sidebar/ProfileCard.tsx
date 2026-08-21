"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui";
import { useUser } from "@/lib/UserContext";

/**
 * Doubles as the "top header" requirement (name / email / avatar / logout) —
 * per the Figma design this lives at the top of the sidebar rather than a
 * full-width bar.
 */
export function ProfileCard() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
      >
        <Avatar src={user.avatarUrl} name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>
        <ChevronIcon />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
