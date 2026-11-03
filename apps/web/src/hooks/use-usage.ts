"use client";

import { useQuery } from "@tanstack/react-query";

import type { UsageSnapshot } from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/** 최근 24시간 토큰 사용량과 한도. */
export function useUsage() {
  return useQuery({
    queryKey: queryKeys.usage,
    queryFn: () => apiRequest<UsageSnapshot>("/usage"),
  });
}
