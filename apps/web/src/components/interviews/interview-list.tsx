"use client";

import Link from "next/link";
import { useState } from "react";

import { useDeleteInterview, useInterviews } from "@/hooks/use-interviews";
import { describeError, INTERVIEW_DIFFICULTY_LABEL } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function InterviewList() {
  const interviews = useInterviews();
  const remove = useDeleteInterview();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (interviews.isPending) {
    return (
      <p className="py-8 text-center text-sm text-black/50 dark:text-white/50">
        불러오는 중…
      </p>
    );
  }
  if (interviews.isError) {
    return (
      <Alert tone="error" title="목록을 불러오지 못했습니다.">
        {describeError(interviews.error)}
      </Alert>
    );
  }
  if (interviews.data.length === 0) {
    return (
      <EmptyState
        title="아직 진행한 면접이 없습니다."
        description="위에서 난이도를 고르고 면접을 만들어 보세요."
      />
    );
  }

  return (
    <div className="space-y-3">
      {remove.isError && (
        <Alert tone="error" title="삭제에 실패했습니다.">
          {describeError(remove.error)}
        </Alert>
      )}

      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {interviews.data.map((interview) => (
          <li
            key={interview.id}
            className="flex items-start justify-between gap-4 py-4"
          >
            <div className="min-w-0">
              <Link
                href={`/interviews/${interview.id}`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {interview.title}
              </Link>
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-black/50 dark:text-white/50">
                <span>
                  난이도 {INTERVIEW_DIFFICULTY_LABEL[interview.difficulty]}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {interview.status === "COMPLETED" ? "종료됨" : "진행 중"}
                </span>
                <span aria-hidden>·</span>
                <span>{formatDate(interview.createdAt)}</span>
              </p>
            </div>

            <div className="shrink-0">
              {confirmingId === interview.id ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    loading={remove.isPending}
                    onClick={() =>
                      remove.mutate(interview.id, {
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
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingId(interview.id)}
                >
                  삭제
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
