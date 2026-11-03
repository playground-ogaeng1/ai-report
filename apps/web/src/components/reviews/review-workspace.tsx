"use client";

import { useDocument } from "@/hooks/use-documents";
import { describeError } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { ReviewPanel } from "./review-panel";

/**
 * 원문 ↔ 첨삭을 나란히 보여줍니다.
 *
 * 문서는 `useDocument` 로 받아오는데, 같은 쿼리를 DocumentDetail 도 쓰므로
 * TanStack Query 캐시를 공유해 요청은 한 번만 나갑니다.
 */
export function ReviewWorkspace({ documentId }: { documentId: string }) {
  const document = useDocument(documentId);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-semibold">
          원문
          {document.data && (
            <span className="ml-2 font-normal text-black/50 dark:text-white/50">
              {document.data.content.length.toLocaleString()}자
            </span>
          )}
        </h2>

        {document.isError ? (
          <Alert tone="error" title="원문을 불러오지 못했습니다.">
            {describeError(document.error)}
          </Alert>
        ) : document.isPending ? (
          <p className="py-6 text-sm text-black/50 dark:text-white/50">
            불러오는 중…
          </p>
        ) : (
          <pre className="max-h-[70vh] overflow-auto rounded-lg border border-black/10 p-4 text-sm whitespace-pre-wrap dark:border-white/15">
            {document.data.content}
          </pre>
        )}
      </section>

      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-semibold">첨삭</h2>
        <ReviewPanel documentId={documentId} />
      </section>
    </div>
  );
}
