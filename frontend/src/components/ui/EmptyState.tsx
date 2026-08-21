import { ReactNode } from "react";

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      {icon && <div className="mb-2 text-4xl">{icon}</div>}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-400">{description}</p>}
    </div>
  );
}
