"use client";

import { useMutation } from "@tanstack/react-query";

import type { BugReportResult } from "@/lib/api";
import { apiRequest } from "@/lib/api/client";

/**
 * 버그 신고를 관리자 메일로 보냅니다.
 *
 * 쌓아두는 데이터가 아니라 무효화할 쿼리가 없습니다.
 * 신고자 이메일은 보내지 않습니다 — api 가 JWT 에서 꺼내 씁니다.
 */
export function useReportBug() {
  return useMutation({
    mutationFn: (input: { message: string; path?: string }) =>
      apiRequest<BugReportResult>("/feedback/bug-report", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
