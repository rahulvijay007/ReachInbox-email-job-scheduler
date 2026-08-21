"use client";

import { ReactNode, useEffect } from "react";

export function Modal({ open, onClose, children, widthClass = "max-w-2xl" }: { open: boolean; onClose: () => void; children: ReactNode; widthClass?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-16 sm:pt-24">
      <button aria-label="Close" className="fixed inset-0 cursor-default" onClick={onClose} tabIndex={-1} />
      <div className={`relative z-10 w-full ${widthClass} rounded-2xl bg-white shadow-xl`}>{children}</div>
    </div>
  );
}
