import type { ReactNode } from "react";

/** 라벨 ↔ 상태값 목록. */
export function StatusList({ children }: { children: ReactNode }) {
  return (
    <dl className="divide-y divide-black/10 text-sm dark:divide-white/10">
      {children}
    </dl>
  );
}

export type StatusTone = "ok" | "pending" | "warning" | "error";

const TONE_ICON: Record<StatusTone, string> = {
  ok: "✅",
  pending: "⏳",
  warning: "⚠️",
  error: "❌",
};

export function StatusItem({
  label,
  hint,
  tone,
  value,
}: {
  label: ReactNode;
  /** 라벨 옆에 작게 붙는 부가 설명 (예: 엔드포인트) */
  hint?: ReactNode;
  tone: StatusTone;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt>
        {label}
        {hint && <code className="ml-2 text-xs opacity-50">{hint}</code>}
      </dt>
      <dd className="shrink-0 text-right">
        <span aria-hidden>{TONE_ICON[tone]}</span> {value}
      </dd>
    </div>
  );
}
