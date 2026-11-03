import { NextResponse } from "next/server";

import { apiRequestServer } from "@/lib/api/server";
import { createClient } from "@/lib/supabase/server";

/** 오픈 리다이렉트 방지 — 같은 사이트의 경로만 허용합니다. */
function safePath(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * 구글 로그인 후 Supabase 가 되돌려 보내는 지점.
 *
 * `?code=` 를 세션으로 교환하면 쿠키가 세팅됩니다. (PKCE 흐름)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safePath(searchParams.get("next"));

  if (!code) {
    // 사용자가 구글 동의 화면에서 취소한 경우 등
    const reason = searchParams.get("error_description") ?? "코드가 없습니다";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(reason)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // 로그인 직후 public.users 에 프로필을 만들어 둡니다. (api 의 GET /me 가 upsert)
  // 실패해도 로그인 자체는 막지 않습니다 — 화면의 연결 상태에 드러납니다.
  try {
    await apiRequestServer("/me");
  } catch (cause) {
    console.warn(
      "[auth/callback] 프로필 생성 실패:",
      cause instanceof Error ? cause.message : cause,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
