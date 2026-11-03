"use client";

import { useInterviewSummary } from "@/hooks/use-interview-turn";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";

/**
 * 면접 종료 + 총평.
 *
 * 저장된 총평이 있으면 그걸 보여주고, 없으면 생성 버튼을 띄웁니다.
 * 면접 중에는 면접관이 평가를 하지 않으므로(프롬프트에서 금지) 피드백은
 * 전부 여기서 나옵니다.
 */
export function InterviewSummary({
  interviewId,
  savedSummary,
  canFinish,
  disabled,
}: {
  interviewId: string;
  savedSummary: string | null;
  /** 답변이 한 번이라도 있어야 총평을 만들 수 있습니다. */
  canFinish: boolean;
  disabled?: boolean;
}) {
  const summary = useInterviewSummary(interviewId);
  const streaming = summary.status === "streaming";

  // 스트리밍 중/직후에는 방금 받은 내용을, 그 외에는 저장된 총평을 보여줍니다.
  const shown = summary.text || savedSummary;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">총평</h2>

        {!savedSummary && canFinish && (
          <Button
            loading={streaming}
            disabled={disabled}
            onClick={() => void summary.start()}
          >
            면접 종료하고 총평 받기
          </Button>
        )}

        {streaming && (
          <span className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
            <span
              className="inline-block size-2 animate-pulse rounded-full bg-current"
              aria-hidden
            />
            대화를 읽고 있습니다…
          </span>
        )}
      </div>

      {summary.status === "error" && summary.error && (
        <Alert tone="error" title="총평 생성에 실패했습니다.">
          {summary.error}
        </Alert>
      )}

      {shown ? (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <Markdown>{shown}</Markdown>
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-middle" />
          )}
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          {canFinish
            ? "면접을 마치면 전체 대화를 바탕으로 총평을 받을 수 있습니다."
            : "질문에 한 번이라도 답하면 총평을 받을 수 있습니다."}
        </p>
      )}
    </section>
  );
}
