"use client";

import { useState } from "react";

import { useDeleteReview, useReviews } from "@/hooks/use-reviews";
import { describeError } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** 지난 첨삭 목록. 최신 1건은 위 패널에 이미 보이므로 2번째부터 접어서 보여줍니다. */
export function ReviewHistory({ documentId }: { documentId: string }) {
  const reviews = useReviews(documentId);
  const remove = useDeleteReview(documentId);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const past = reviews.data?.slice(1) ?? [];
  if (past.length === 0) return null;

  return (
    <section className="pt-2">
      <h3 className="mb-2 text-sm font-semibold">
        지난 첨삭{" "}
        <span className="font-normal text-black/50 dark:text-white/50">
          {past.length}건
        </span>
      </h3>

      {remove.isError && (
        <Alert tone="error" title="삭제에 실패했습니다.">
          {describeError(remove.error)}
        </Alert>
      )}

      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {past.map((review) => (
          <li key={review.id} className="py-3">
            <details>
              <summary className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-xs text-black/60 dark:text-white/60">
                  {formatDateTime(review.createdAt)}
                  {review.outputTokens !== null && (
                    <span className="ml-2 opacity-70">
                      {review.outputTokens.toLocaleString()} 토큰
                    </span>
                  )}
                </span>
              </summary>

              <div className="mt-3">
                <Markdown>{review.feedback}</Markdown>

                <div className="mt-3 flex items-center gap-2">
                  {confirmingId === review.id ? (
                    <>
                      <Button
                        variant="danger"
                        loading={remove.isPending}
                        onClick={() =>
                          remove.mutate(review.id, {
                            onSettled: () => setConfirmingId(null),
                          })
                        }
                      >
                        정말 삭제
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={remove.isPending}
                        onClick={() => setConfirmingId(null)}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmingId(review.id)}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
