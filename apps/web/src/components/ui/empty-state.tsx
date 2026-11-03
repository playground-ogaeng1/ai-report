import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 p-8 text-center dark:border-white/20">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {description}
        </p>
      )}
    </div>
  );
}
