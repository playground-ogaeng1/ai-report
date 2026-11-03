"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  AdminLogEntry,
  AdminLogLevel,
  AdminRequestEntry,
  AdminStats,
} from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/**
 * 운영 화면은 열어둔 동안 계속 갱신되는 게 쓸모 있으므로 폴링합니다.
 * 관리자가 의도적으로 연 화면이라 5초 간격이면 부담이 없습니다.
 */
const POLL_MS = 5_000;

export function useAdminRequests(limit = 100) {
  return useQuery({
    queryKey: queryKeys.admin.requests,
    queryFn: () =>
      apiRequest<AdminRequestEntry[]>(`/admin/requests?limit=${limit}`),
    refetchInterval: POLL_MS,
    staleTime: 0,
  });
}

export function useAdminLogs(level: AdminLogLevel | "all", limit = 200) {
  return useQuery({
    queryKey: queryKeys.admin.logs(level),
    queryFn: () => {
      const query = new URLSearchParams({ limit: String(limit) });
      if (level !== "all") query.set("level", level);

      return apiRequest<AdminLogEntry[]>(`/admin/logs?${query.toString()}`);
    },
    refetchInterval: POLL_MS,
    staleTime: 0,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => apiRequest<AdminStats>("/admin/stats"),
    refetchInterval: POLL_MS,
    staleTime: 0,
  });
}
