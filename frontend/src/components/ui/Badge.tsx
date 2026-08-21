import { ReactNode } from "react";

type Tone = "orange" | "green" | "gray" | "red";

const toneClasses: Record<Tone, string> = {
  orange: "bg-orange-50 text-orange-600",
  green: "bg-brand-50 text-brand-600",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-50 text-red-600",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
