"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryKeys } from "@/lib/query/keys";
import { useStreamText } from "./use-stream-text";

/**
 * 답변을 보내고 면접관의 다음 질문을 받습니다.
 *
 * `content` 를 비우고 호출하면 답변 없이 면접관 턴만 생성합니다 —
 * 첫 질문과, 실패 후 재시도에 씁니다.
 */
export function useInterviewTurn(interviewId: string) {
  const queryClient = useQueryClient();

  const stream = useStreamText(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.interviews.detail(interviewId),
    });
    // 토큰을 썼으므로 비용 가드 표시도 갱신합니다.
    void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
  });

  const send = useCallback(
    (content?: string) =>
      stream.start(`/interviews/${interviewId}/messages`, { content }),
    [stream, interviewId],
  );

  return { ...stream, send };
}

/** 면접을 종료하고 총평을 받습니다. */
export function useInterviewSummary(interviewId: string) {
  const queryClient = useQueryClient();

  const stream = useStreamText(() => {
    // 상태가 COMPLETED 로 바뀌므로 목록도 함께 갱신합니다.
    void queryClient.invalidateQueries({
      queryKey: queryKeys.interviews.detail(interviewId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.interviews.all,
    });
    // 토큰을 썼으므로 비용 가드 표시도 갱신합니다.
    void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
  });

  const start = useCallback(
    () => stream.start(`/interviews/${interviewId}/summary`),
    [stream, interviewId],
  );

  return { ...stream, start };
}
