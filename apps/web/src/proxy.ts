import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/update-session";

/**
 * Next.js 16 부터 `middleware.ts` 는 `proxy.ts` 로 이름이 바뀌었고, 내보내는
 * 함수도 `proxy`(또는 default) 여야 합니다. 블로그 글의 `middleware.ts` 코드를
 * 그대로 가져오면 **파일이 아예 호출되지 않아** 세션이 갱신되지 않습니다.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자원은 제외합니다. 그 외 모든 경로에서 세션을 갱신해야 하므로
     * (갱신하지 않으면 토큰이 만료됨) 범위를 넓게 잡습니다.
     * 로그인 없이 접근 가능한 경로는 update-session.ts 의 PUBLIC_PATHS 에서 거릅니다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
