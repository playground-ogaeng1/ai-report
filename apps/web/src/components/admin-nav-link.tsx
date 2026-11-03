"use client";

import Link from "next/link";

import { useProfile } from "@/hooks/use-profile";

/**
 * 관리자에게만 보이는 운영 조회 링크.
 *
 * 화면에서 감추는 것은 **편의일 뿐**입니다 — URL 을 직접 치고 들어가도
 * api 가 404 를 주므로 데이터는 보이지 않습니다.
 */
export function AdminNavLink() {
  const profile = useProfile();

  if (!profile.data?.admin) return null;

  return (
    <Link
      href="/admin"
      className="inline-block rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      운영 조회 →
    </Link>
  );
}
