import Link from "next/link";

import { InterviewForm } from "@/components/interviews/interview-form";
import { InterviewList } from "@/components/interviews/interview-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireClaims } from "@/lib/require-auth";

export default async function InterviewsPage() {
  await requireClaims();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <PageHeader
        title="모의 면접"
        description="등록한 문서를 바탕으로 면접관이 질문합니다. 난이도에 따라 꼬리질문의 개수와 깊이가 달라집니다."
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
        <h2 className="mb-4 text-lg font-semibold">새 면접</h2>
        <InterviewForm />
      </section>

      <section className="mt-12">
        <h2 className="mb-2 text-lg font-semibold">지난 면접</h2>
        <InterviewList />
      </section>
    </main>
  );
}
