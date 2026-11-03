/**
 * 쿼리 키를 한곳에서 관리합니다.
 *
 * 문자열을 호출부에 흩뿌리면 무효화(invalidate) 할 때 키가 안 맞아서
 * 캐시가 갱신되지 않는 사고가 납니다.
 */
export const queryKeys = {
  health: ["health"] as const,
  profile: ["profile"] as const,
  /** 비용 가드 사용량 — Claude 를 쓴 뒤 무효화합니다. */
  usage: ["usage"] as const,
  documents: {
    /** 목록 + 상세를 모두 덮는 접두사 — 무효화할 때 이걸 씁니다. */
    all: ["documents"] as const,
    detail: (id: string) => ["documents", id] as const,
  },
  reviews: {
    /** 문서 1건의 첨삭 이력 */
    forDocument: (documentId: string) =>
      ["documents", documentId, "reviews"] as const,
  },
  interviews: {
    all: ["interviews"] as const,
    detail: (id: string) => ["interviews", id] as const,
  },
  admin: {
    requests: ["admin", "requests"] as const,
    logs: (level: string) => ["admin", "logs", level] as const,
    stats: ["admin", "stats"] as const,
  },
} as const;
