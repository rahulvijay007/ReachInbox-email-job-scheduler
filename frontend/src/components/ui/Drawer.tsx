"use client";

import { ReactNode } from "react";

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!open}
    >
      <button aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} tabIndex={-1} />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-xl transform bg-white shadow-2xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {children}
      </div>
    </div>
  );
}
