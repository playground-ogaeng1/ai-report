"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryKeys } from "@/lib/query/keys";
import { useStreamText } from "./use-stream-text";

/** 첨삭을 생성하면서 도착하는 글자를 실시간으로 쌓습니다. */
export function useCreateReview(documentId: string) {
  const queryClient = useQueryClient();

  const stream = useStreamText(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.reviews.forDocument(documentId),
    });
    // 토큰을 썼으므로 비용 가드 표시도 갱신합니다.
    void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
  });

  const start = useCallback(
    () => stream.start(`/documents/${documentId}/reviews`),
    [stream, documentId],
  );

  return { ...stream, start };
}
