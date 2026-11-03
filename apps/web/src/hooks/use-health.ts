"use client";

import { useQuery } from "@tanstack/react-query";

import type { HealthResult } from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/** api 와 DB 연결 상태. */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiRequest<HealthResult>("/health"),
  });
}
