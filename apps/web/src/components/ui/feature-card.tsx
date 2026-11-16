import type { ReactNode } from "react";

/**
 * 번호가 붙은 기능 소개 카드. 링크가 아니라 **설명**입니다 —
 * 이동은 상단 내비게이션이 맡습니다.
 *
 * 번호는 본문과 같은 크기의 모노 글자로만 둡니다. 배경 박스로 감싸면
 * 템플릿 느낌이 납니다 (UI_GUIDE 의 안티패턴).
 */
export function FeatureCard({
  index,
  title,
  subtitle,
  description,
}: {
  /** 1부터 시작하는 순서. `01` 처럼 두 자리로 그립니다. */
  index: number;
  title: ReactNode;
  /** 한 줄 요약 */
  subtitle: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-black/15 p-5 dark:border-white/20">
      <p className="font-mono text-xs text-black/50 dark:text-white/50">
        {String(index).padStart(2, "0")}
      </p>

      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs font-medium text-black/60 dark:text-white/60">
        {subtitle}
      </p>

      <p className="mt-3 text-xs leading-relaxed text-black/50 dark:text-white/50">
        {description}
      </p>
    </div>
  );
}
