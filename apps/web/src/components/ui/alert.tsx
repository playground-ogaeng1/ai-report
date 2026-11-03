import type { ReactNode } from "react";

export type AlertTone = "info" | "success" | "warning" | "error";

const TONE_CLASS: Record<AlertTone, string> = {
  info: "border-sky-500/40 bg-sky-500/10",
  success: "border-emerald-500/40 bg-emerald-500/10",
  warning: "border-amber-500/40 bg-amber-500/10",
  error: "border-red-500/40 bg-red-500/10",
};

/** 알림 박스. 데이터를 모르고 props 만 받습니다. */
export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: AlertTone;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${TONE_CLASS[tone]}`}>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-xs opacity-80">{children}</div>}
    </div>
  );
}
