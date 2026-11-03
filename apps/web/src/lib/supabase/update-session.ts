import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 로그인 없이 접근해야 하는 경로 */
const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * 액세스 토큰을 갱신하고, 미로그인 요청을 /login 으로 돌립니다.
 *
 * ⚠️ 이 함수는 proxy.ts 에서 **반드시** 호출돼야 합니다. 호출하지 않으면
 * 토큰이 만료돼도 갱신되지 않아 사용자가 로그아웃됩니다.
 *
 * ⚠️ 반환값은 setAll 이 마지막으로 만든 supabaseResponse 그대로여야 합니다.
 * 중간에 새 NextResponse 를 만들어 반환하면 갱신된 쿠키가 실리지 않습니다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getSession() 이 아니라 getClaims() 를 씁니다 — getSession 은 쿠키 값을
  // 재검증 없이 읽기 때문에 서버에서 신뢰하면 안 됩니다.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isLoggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // 로그인 후 원래 가려던 곳으로 되돌려 보냅니다.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
