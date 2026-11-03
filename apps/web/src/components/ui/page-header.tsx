import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** 오른쪽에 붙는 액션 (예: 로그아웃 버튼) */
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
