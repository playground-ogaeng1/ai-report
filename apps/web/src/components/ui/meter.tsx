import type { ReactNode } from "react";

export type MeterTone = "normal" | "warning" | "danger";

const BAR_CLASS: Record<MeterTone, string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

/** 사용량 막대. **순수 UI** — 비율 계산만 하고 데이터는 모릅니다. */
export function Meter({
  label,
  value,
  max,
  caption,
  tone = "normal",
}: {
  label: ReactNode;
  value: number;
  max: number;
  caption?: ReactNode;
  tone?: MeterTone;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span>{label}</span>
        <span className="text-xs text-black/50 dark:text-white/50">
          {percent}%
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
      >
        <div
          className={`h-full rounded-full transition-[width] ${BAR_CLASS[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {caption && (
        <p className="mt-1.5 text-xs text-black/50 dark:text-white/50">
          {caption}
        </p>
      )}
    </div>
  );
}
