import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from '../auth/authed-request.js';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator.js';
import { RateLimitService } from './rate-limit.service.js';

/** `@RateLimit()` 을 붙이지 않은 핸들러에 적용되는 값 */
const DEFAULT: RateLimitOptions = { max: 30, windowSec: 60 };

/** Retry-After 헤더를 붙이기 위한 최소 응답 형태 */
interface ResponseWithHeader {
  setHeader(name: string, value: string): void;
}

/**
 * 사용자별 요청 빈도 제한.
 *
 * **`SupabaseAuthGuard` 뒤에 와야 합니다** — `request.user` 가 있어야
 * 사용자별로 셀 수 있습니다. Nest 는 컨트롤러 가드 → 라우트 가드 순서로
 * 실행하므로, 클래스에 인증 가드를 두고 메서드에 이걸 붙이면 됩니다.
 *
 * 카운터 키에 핸들러 이름을 넣어서 **엔드포인트별로 예산을 따로** 줍니다.
 * 첨삭을 많이 받았다고 면접이 막히면 안 되니까요.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user) {
      throw new Error(
        'RateLimitGuard 는 SupabaseAuthGuard 뒤에 적용해야 합니다.',
      );
    }

    const key = `${context.getClass().name}.${context.getHandler().name}:${request.user.id}`;
    const decision = this.limiter.check(
      key,
      options.max,
      options.windowSec * 1000,
    );

    if (!decision.allowed) {
      const response = context
        .switchToHttp()
        .getResponse<ResponseWithHeader>();
      response.setHeader('Retry-After', String(decision.retryAfterSec));

      throw new HttpException(
        `요청이 너무 잦습니다. ${decision.retryAfterSec}초 후에 다시 시도해 주세요.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
