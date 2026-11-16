import Link from "next/link";

import { AdminNavLink } from "@/components/admin-nav-link";
import { DocumentCta } from "@/components/document-cta";
import { RecentActivity } from "@/components/recent-activity";
import { SignOutButton } from "@/components/sign-out-button";
import { FeatureCard } from "@/components/ui/feature-card";
import { displayNameOf, requireClaims } from "@/lib/require-auth";

const NAV_CLASS =
  "inline-block rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

const FEATURES = [
  {
    title: "문서 등록",
    subtitle: "이력서 · 자소서 · 포트폴리오",
    description:
      "직접 입력하거나 PDF 로 올립니다. PDF 는 등록하는 시점에 텍스트를 추출해 보관하므로, 이후 첨삭과 면접이 같은 내용을 봅니다.",
  },
  {
    title: "자소서 첨삭",
    subtitle: "문장을 짚는 피드백",
    description:
      "내가 쓴 문장에서 어디가 왜 약한지, 어떻게 고치면 좋을지 알려줍니다. 같은 문서로 여러 번 받아 이력을 비교할 수 있습니다.",
  },
  {
    title: "모의 면접 · 총평",
    subtitle: "문서 기반 꼬리질문",
    description:
      "등록한 문서를 근거로 면접관이 질문합니다. 난이도에 따라 꼬리질문의 개수와 깊이가 달라지고, 끝내면 총평이 남습니다.",
  },
];

/**
 * 인증 게이트 + 레이아웃만 담당하는 서버 컴포넌트.
 * 사용량·문서 유무 같은 화면 데이터는 데이터 컴포넌트가 가져옵니다.
 *
 * 제목 줄은 h1 이 아닙니다 — 이 화면의 h1 은 히어로 문구 하나입니다.
 */
export default async function Home() {
  const claims = await requireClaims();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold tracking-tight">
            AI 인터뷰어 &amp; 자소서 멘토
          </p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {displayNameOf(claims)} 님, 안녕하세요.
          </p>
        </div>
        <SignOutButton />
      </header>

      <nav className="mt-6 flex flex-wrap gap-3">
        <Link href="/documents" className={NAV_CLASS}>
          이력서 · 자소서 관리 →
        </Link>
        <Link href="/interviews" className={NAV_CLASS}>
          모의 면접 →
        </Link>
        <AdminNavLink />
      </nav>

      <section className="mt-16">
        <h1 className="text-3xl font-bold tracking-tight">
          내가 쓴 문장에서 시작하는 면접 준비.
        </h1>
        <p className="mt-3 text-sm text-black/60 dark:text-white/60">
          AI가 자소서 첨삭부터 꼬리질문 면접까지 내가 쓴 문장을 근거로 진행합니다.
        </p>
      </section>

      <div className="mt-10 border-t border-black/10 dark:border-white/15" />

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            index={index + 1}
            title={feature.title}
            subtitle={feature.subtitle}
            description={feature.description}
          />
        ))}
      </section>

      <div className="mt-6">
        <DocumentCta />
      </div>

      <RecentActivity />
    </main>
  );
}
