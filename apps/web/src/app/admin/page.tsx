import Link from "next/link";

import { EndpointStats } from "@/components/admin/endpoint-stats";
import { LogView } from "@/components/admin/log-view";
import { RequestLog } from "@/components/admin/request-log";
import { PageHeader } from "@/components/ui/page-header";
import { requireClaims } from "@/lib/require-auth";
import { UsageMeter } from "@/components/usage-meter";

/**
 * 운영 조회 화면.
 *
 * 로그인만 확인하고 **관리자 여부는 api 가 판단**합니다. 화면을 숨기는 것은
 * 편의일 뿐이고, 권한이 없으면 각 패널이 "접근 권한이 없습니다" 를 띄웁니다.
 * (api 는 관리자가 아니면 404 로 응답합니다)
 */
export default async function AdminPage() {
  await requireClaims();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <PageHeader
        title="운영 조회"
        description="최근 API 호출과 백엔드 로그. 5초마다 갱신됩니다."
        action={
          <Link
            href="/"
            className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
          >
            홈
          </Link>
        }
      />

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">사용량</h2>
        <UsageMeter />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">엔드포인트별 집계</h2>
        <EndpointStats />
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-lg font-semibold">최근 API 호출</h2>
        <RequestLog />
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-lg font-semibold">백엔드 로그</h2>
        <LogView />
      </section>

      <p className="mt-12 text-xs text-black/50 dark:text-white/50">
        기록은 api 프로세스 메모리에 쌓입니다 — 재시작하면 비워지고, 인스턴스를
        여러 개로 늘리면 각자 따로 쌓입니다.
      </p>
    </main>
  );
}
