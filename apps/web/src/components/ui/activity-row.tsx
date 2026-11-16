import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * 바로가기 한 줄. 제목과 보조 정보를 묶어 보여줍니다.
 *
 * href 는 `Link` 가 받는 타입을 그대로 씁니다 — typedRoutes 가 켜져 있어서
 * `string` 으로 두면 없는 경로를 적어도 타입체크가 잡아주지 못합니다.
 */
export function ActivityRow({
  href,
  title,
  meta,
}: {
  href: ComponentProps<typeof Link>["href"];
  title: string;
  /** 가운뎃점으로 이어 붙는 보조 정보 (예: ["진행 중", "난이도 보통"]) */
  meta: readonly string[];
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-lg border border-black/15 px-4 py-3 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-black/50 dark:text-white/50">
          {meta.map((item, index) => (
            <span key={item} className="flex gap-x-2">
              {index > 0 && <span aria-hidden>·</span>}
              {item}
            </span>
          ))}
        </span>
      </span>

      <span
        aria-hidden
        className="shrink-0 text-xs text-black/50 dark:text-white/50"
      >
        →
      </span>
    </Link>
  );
}
