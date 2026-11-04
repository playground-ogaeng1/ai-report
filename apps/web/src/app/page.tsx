import Link from "next/link";

import { AdminNavLink } from "@/components/admin-nav-link";
import { ConnectionStatus } from "@/components/connection-status";
import { SignOutButton } from "@/components/sign-out-button";
import { UsageMeter } from "@/components/usage-meter";
import { PageHeader } from "@/components/ui/page-header";
import { displayNameOf, requireClaims } from "@/lib/require-auth";

/**
 * 인증 게이트 + 레이아웃만 담당하는 서버 컴포넌트.
 * 화면에 뿌릴 데이터는 ConnectionStatus 가 TanStack Query 로 가져옵니다.
 */
export default async function Home() {
  const claims = await requireClaims();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <PageHeader
        title="AI 인터뷰어 & 자소서 멘토"
        description={`${displayNameOf(claims)} 님으로 로그인했습니다.`}
        action={<SignOutButton />}
      />

      <nav className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/documents"
          className="inline-block rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          이력서 · 자소서 관리 →
        </Link>
        <Link
          href="/interviews"
          className="inline-block rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          모의 면접 →
        </Link>
        <AdminNavLink />
      </nav>

      {/* <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">연결 상태</h2>
        <ConnectionStatus />
      </section> */}
    </main>
  );
}
