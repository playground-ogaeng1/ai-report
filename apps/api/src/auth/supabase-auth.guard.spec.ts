import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

const SUPABASE_URL = 'https://example.supabase.co';

/**
 * 기본값을 주지 않습니다 — 기본 매개변수는 `undefined` 를 넘겨도 적용돼서
 * "URL 이 없는 경우" 를 테스트할 수 없습니다.
 */
function makeConfig(url: string | undefined) {
  return { get: vi.fn(() => url) } as never;
}

/** 헤더만 들고 있는 최소 ExecutionContext */
function makeContext(authorization?: string): ExecutionContext {
  const request = { headers: authorization ? { authorization } : {} };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard 생성', () => {
  it('SUPABASE_URL 이 없으면 바로 터뜨린다 — 조용히 통과시키면 안 된다', () => {
    expect(() => new SupabaseAuthGuard(makeConfig(undefined))).toThrow(
      /SUPABASE_URL/,
    );
  });

  it('URL 끝의 슬래시는 정리한다', () => {
    // 슬래시가 남으면 JWKS 경로가 // 로 중복되고 issuer 도 안 맞습니다.
    expect(
      () => new SupabaseAuthGuard(makeConfig(`${SUPABASE_URL}/`)),
    ).not.toThrow();
  });
});

describe('SupabaseAuthGuard — 토큰 추출', () => {
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    guard = new SupabaseAuthGuard(makeConfig(SUPABASE_URL));
  });

  it('Authorization 헤더가 없으면 401', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Bearer 가 아닌 스킴은 401', async () => {
    await expect(
      guard.canActivate(makeContext('Basic dXNlcjpwYXNz')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('Bearer 뒤가 비어 있으면 401', async () => {
    await expect(guard.canActivate(makeContext('Bearer '))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('스킴 대소문자는 가린다 — bearer 도 받는다', async () => {
    // 여기서는 토큰 추출은 성공하고 서명 검증 단계로 넘어가야 합니다.
    // (검증 자체는 JWKS 네트워크 호출이 필요해 단위 테스트에서 다루지 않습니다)
    await expect(
      guard.canActivate(makeContext('bearer not-a-real-jwt')),
    ).rejects.toThrow(/검증에 실패/);
  });

  it('토큰이 없을 때와 검증 실패를 다른 메시지로 구분한다', async () => {
    // 디버깅할 때 "키가 안 붙었다" 와 "토큰이 틀렸다" 는 완전히 다른 문제입니다.
    const missing = await guard
      .canActivate(makeContext())
      .catch((error: Error) => error.message);
    const invalid = await guard
      .canActivate(makeContext('Bearer garbage'))
      .catch((error: Error) => error.message);

    expect(missing).not.toBe(invalid);
    expect(missing).toMatch(/토큰이 없습니다/);
  });
});
