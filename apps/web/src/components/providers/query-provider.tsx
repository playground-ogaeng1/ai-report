"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,

        /**
         * 개발 중 흔한 상황: `pnpm dev` 직후 NestJS 가 아직 컴파일 중(5~15초)
         * 이라 연결이 거부됩니다. 이때는 길게 재시도해서 사용자가 새로고침하지
         * 않아도 화면이 채워지게 합니다.
         *
         * 반대로 4xx 는 다시 보내도 결과가 같으므로 즉시 포기합니다.
         */
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.isClientFault) return false;
          return failureCount < 8;
        },
        retryDelay: 2000,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState 로 감싸야 요청/마운트마다 새 인스턴스가 생깁니다.
  // 모듈 전역에 두면 서버에서 사용자 간 캐시가 섞입니다.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
