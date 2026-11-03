"use client";

import { useCreateReview } from "@/hooks/use-create-review";
import { useReviews } from "@/hooks/use-reviews";
import { describeError } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewHistory } from "./review-history";
import { Markdown } from "@/components/ui/markdown";

/**
 * 첨삭 생성 + 결과 표시.
 *
 * 스트리밍 중에는 방금 도착한 텍스트를, 끝난 뒤에는 저장된 이력을 보여줍니다.
 */
export function ReviewPanel({ documentId }: { documentId: string }) {
  const review = useCreateReview(documentId);
  const reviews = useReviews(documentId);

  const streaming = review.status === "streaming";
  const hasStreamText = review.text.length > 0;
  const latest = reviews.data?.[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          loading={streaming}
          onClick={() => void review.start()}
        >
          {reviews.data && reviews.data.length > 0
            ? "다시 첨삭받기"
            : "첨삭받기"}
        </Button>

        {streaming && (
          <Button variant="ghost" onClick={review.cancel}>
            중단
          </Button>
        )}

        {streaming && !hasStreamText && (
          <span className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
            <span
              className="inline-block size-2 animate-pulse rounded-full bg-current"
              aria-hidden
            />
            읽고 있습니다…
          </span>
        )}
      </div>

      {review.status === "error" && review.error && (
        <Alert tone="error" title="첨삭에 실패했습니다.">
          {review.error}
        </Alert>
      )}

      {/* 스트리밍 중이거나 방금 끝난 결과 */}
      {hasStreamText && (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <Markdown>{review.text}</Markdown>
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-middle" />
          )}
        </div>
      )}

      {/* 아직 아무것도 없을 때 */}
      {!hasStreamText && !streaming && (
        <>
          {reviews.isError ? (
            <Alert tone="error" title="첨삭 이력을 불러오지 못했습니다.">
              {describeError(reviews.error)}
            </Alert>
          ) : reviews.isPending ? (
            <p className="py-6 text-center text-sm text-black/50 dark:text-white/50">
              불러오는 중…
            </p>
          ) : latest ? (
            <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <Markdown>{latest.feedback}</Markdown>
            </div>
          ) : (
            <EmptyState
              title="아직 첨삭받지 않았습니다."
              description="위 버튼을 누르면 채용 담당자 관점의 피드백을 받을 수 있습니다."
            />
          )}
        </>
      )}

      <ReviewHistory documentId={documentId} />
    </div>
  );
}
