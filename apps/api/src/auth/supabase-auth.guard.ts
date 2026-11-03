import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import type { AuthedRequest, AuthUser } from './authed-request.js';

/** `Authorization: Bearer <accessToken>` 에서 토큰만 꺼냅니다. */
function extractToken(request: AuthedRequest): string | undefined {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return undefined;

  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return undefined;

  return value || undefined;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Supabase 액세스 토큰의 클레임을 사용자 정보로 변환합니다. */
function toAuthUser(payload: JWTPayload): AuthUser {
  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;

  return {
    id: payload.sub!,
    email: str(payload.email) ?? str(meta.email),
    // 구글은 full_name 으로 내려줍니다.
    name: str(meta.full_name) ?? str(meta.name),
    image: str(meta.avatar_url) ?? str(meta.picture),
  };
}

/**
 * Supabase 액세스 토큰(JWT)을 검증해서 호출자를 식별합니다.
 *
 * 이 프로젝트는 **ES256 비대칭 키**를 쓰므로 JWKS 공개키로 로컬 검증합니다.
 * 시크릿을 공유하지 않고, 요청마다 Supabase 로 왕복하지도 않습니다.
 * (createRemoteJWKSet 이 공개키를 캐시하고 필요할 때만 갱신합니다)
 *
 * 토큰 만료 전까지는 강제 로그아웃이 즉시 반영되지 않습니다. 필요해지면
 * 블랙리스트 조회를 추가해야 합니다.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(config: ConfigService) {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error(
        'SUPABASE_URL 이 설정되지 않았습니다. apps/api/.env 를 확인하세요.',
      );
    }

    const base = supabaseUrl.replace(/\/+$/, '');
    this.issuer = `${base}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${base}/auth/v1/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    const token = extractToken(request);
    if (!token) {
      throw new UnauthorizedException('액세스 토큰이 없습니다.');
    }

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      }));
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired) {
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      }
      throw new UnauthorizedException(
        `토큰 검증에 실패했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Supabase 는 로그인한 사용자 토큰에 aud=authenticated 를 넣습니다.
    // jwtVerify 옵션 대신 직접 보는 이유는 실패 원인을 명확히 남기기 위해서입니다.
    const aud = payload.aud;
    const audOk = Array.isArray(aud)
      ? aud.includes('authenticated')
      : aud === 'authenticated';
    if (!audOk) {
      throw new UnauthorizedException(
        `로그인한 사용자의 토큰이 아닙니다 (aud=${JSON.stringify(aud)}).`,
      );
    }

    if (!payload.sub) {
      throw new UnauthorizedException('토큰에 sub 클레임이 없습니다.');
    }

    request.user = toAuthUser(payload);
    return true;
  }
}
