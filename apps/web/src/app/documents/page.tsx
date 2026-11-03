import Link from "next/link";

import { DocumentCreatePanel } from "@/components/documents/document-create-panel";
import { DocumentList } from "@/components/documents/document-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireClaims } from "@/lib/require-auth";

export default async function DocumentsPage() {
  await requireClaims();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <PageHeader
        title="이력서 · 자소서"
        description="등록한 문서를 바탕으로 첨삭과 모의 면접을 진행합니다."
        action={
          <Link
            href="/"
            className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
          >
            홈
          </Link>
        }
      />

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">새로 등록</h2>
        <DocumentCreatePanel />
      </section>

      <section className="mt-12">
        <h2 className="mb-2 text-lg font-semibold">등록한 문서</h2>
        <DocumentList />
      </section>
    </main>
  );
}
