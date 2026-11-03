import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

/**
 * 서버 컴포넌트용 인증 게이트.
 *
 * proxy.ts 가 이미 쿠키 없는 요청을 걸러내지만, 쿠키가 만료·위조됐을 수도
 * 있으므로 페이지에서 한 번 더 확인합니다. `getSession()` 이 아니라
 * `getClaims()` 를 써야 서명이 검증됩니다.
 */
export async function requireClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect("/login");

  return data.claims;
}

/** 클레임에서 화면에 쓸 이름을 뽑습니다. 구글은 full_name 으로 내려줍니다. */
export function displayNameOf(claims: {
  email?: string;
  user_metadata?: unknown;
}): string {
  const meta = claims.user_metadata as
    | { full_name?: string; name?: string }
    | undefined;

  return meta?.full_name ?? meta?.name ?? claims.email ?? "사용자";
}
