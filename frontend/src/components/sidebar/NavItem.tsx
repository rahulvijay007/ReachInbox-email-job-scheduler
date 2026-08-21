"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function NavItem({ href, icon, label, count }: { href: string; icon: ReactNode; label: string; count?: number }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span className={active ? "text-brand-600" : "text-gray-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {typeof count === "number" && (
        <span className={`text-xs ${active ? "text-brand-600" : "text-gray-400"}`}>{count}</span>
      )}
    </Link>
  );
}
