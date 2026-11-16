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
  action,
}: {
  tone?: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  /** 오른쪽에 붙는 액션 (예: "등록하기 →" 링크). 좁은 화면에서는 아래로 내려갑니다. */
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${TONE_CLASS[tone]}`}
    >
      <div>
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 text-xs opacity-80">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
