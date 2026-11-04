"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { InterviewDetail } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import { useStreamText } from "./use-stream-text";

/**
 * 서버가 답변 id 를 돌려주기 전에 임시로 붙이는 접두사.
 * 다음 refetch 때 실제 메시지로 교체됩니다.
 */
const OPTIMISTIC_ID_PREFIX = "optimistic-";

/**
 * 답변을 보내고 면접관의 다음 질문을 받습니다.
 *
 * `content` 를 비우고 호출하면 답변 없이 면접관 턴만 생성합니다 —
 * 첫 질문과, 실패 후 재시도에 씁니다.
 */
export function useInterviewTurn(interviewId: string) {
  const queryClient = useQueryClient();

  /**
   * 말풍선을 **즉시** 화면에 올립니다. 다음 refetch 가 실제 메시지로
   * 교체하므로 id 는 임시값이면 됩니다.
   */
  const append = useCallback(
    (role: "USER" | "ASSISTANT", content: string) => {
      queryClient.setQueryData<InterviewDetail>(
        queryKeys.interviews.detail(interviewId),
        (previous) =>
          previous
            ? {
                ...previous,
                messages: [
                  ...previous.messages,
                  {
                    id: `${OPTIMISTIC_ID_PREFIX}${role}-${Date.now()}`,
                    role,
                    content,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : previous,
      );
    },
    [queryClient, interviewId],
  );

  const resync = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.interviews.detail(interviewId),
    });
  }, [queryClient, interviewId]);

  const stream = useStreamText(
    useCallback(
      (text: string) => {
        // 스트리밍 말풍선은 status 가 "done" 이 되는 순간 사라집니다.
        // refetch 가 도착하기 전까지 질문이 화면에서 비지 않게, 받은
        // 텍스트를 먼저 캐시에 올려 둡니다.
        append("ASSISTANT", text);
        resync();
        // 토큰을 썼으므로 비용 가드 표시도 갱신합니다.
        void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      },
      [append, resync, queryClient],
    ),
    // 실패하면 낙관적으로 끼워 넣은 답변을 서버 기준으로 되돌립니다.
    // 서버에 무엇이 남았는지는 경우마다 다릅니다 — 레이트리밋은 저장 전에
    // 거절되고, 모델 오류는 답변이 이미 저장돼 있습니다. 추측하지 않습니다.
    resync,
  );

  const send = useCallback(
    (content?: string) => {
      // 답변을 **보내는 즉시** 화면에 올립니다.
      //
      // 서버는 모델 호출 전에 답변을 저장하지만, 화면은 스트림이 끝난 뒤
      // (onDone) 에야 갱신됩니다. 그 사이 textarea 는 이미 비워져 있어서
      // 내가 쓴 답변이 화면 어디에도 없는 구간이 생깁니다 — 질문이 다
      // 도착한 뒤 답변과 질문이 한꺼번에 나타나 이질감이 듭니다.
      if (content) append("USER", content);

      return stream.start(`/interviews/${interviewId}/messages`, { content });
    },
    [stream, interviewId, append],
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
