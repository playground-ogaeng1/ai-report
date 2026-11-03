import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트 / 서버 액션 / 라우트 핸들러에서 쓰는 Supabase 클라이언트.
 *
 * 요청마다 새로 만들어야 합니다. 전역 변수에 담아두면 다른 사용자의 쿠키를
 * 물고 갈 수 있습니다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다.
            // 세션 갱신은 proxy.ts 가 담당하므로 여기서는 무시해도 됩니다.
          }
        },
      },
    },
  );
}
