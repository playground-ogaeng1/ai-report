"use client";

import { useQuery } from "@tanstack/react-query";

import type { Profile } from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/**
 * 내 프로필.
 *
 * api 가 액세스 토큰을 검증하므로, 이 쿼리가 성공한다는 건 인증 경로
 * (web → api → JWKS) 전체가 살아있다는 뜻이기도 합니다.
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiRequest<Profile>("/me"),
    // 프로필은 거의 안 바뀌므로 길게 캐시합니다.
    staleTime: 5 * 60_000,
  });
}
