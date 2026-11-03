import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { AuthUser } from '../auth/authed-request.js';
import { logBuffer } from './log-buffer.js';

/**
 * 미들웨어가 쓰는 요청·응답의 최소 형태.
 * express 타입에 의존하지 않도록 필요한 것만 선언합니다.
 */
export interface LoggableRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  /** SupabaseAuthGuard 가 채웁니다 (가드를 통과한 경우에만) */
  user?: AuthUser;
  /** AllExceptionsFilter 가 채웁니다 */
  loggedErrorMessage?: string;
}

export interface LoggableResponse {
  statusCode: number;
  on(event: 'finish', listener: () => void): unknown;
}

/**
 * 모든 요청을 링 버퍼에 기록합니다.
 *
 * **왜 인터셉터가 아니라 미들웨어인가:** NestJS 실행 순서는
 * `미들웨어 → 가드 → 인터셉터 → 핸들러` 입니다. 가드가 거절하면
 * 인터셉터는 **실행되지 않으므로**, 인터셉터로 기록하면 인증 실패(401)나
 * 권한 없음(404) 요청이 전부 누락됩니다. 운영 조회에서 가장 보고 싶은
 * "거절된 호출" 이 안 보이는 셈입니다.
 *
 * 미들웨어는 가드보다 먼저 돌고, `finish` 는 응답이 끝난 뒤에 불리므로
 * **최종 상태 코드와 (가드가 채운) 호출자 정보를 모두** 읽을 수 있습니다.
 *
 * **본문과 헤더는 기록하지 않습니다.** 본문엔 이력서·자소서 전문,
 * 헤더엔 액세스 토큰이 들어 있습니다. 쿼리스트링도 떼어냅니다.
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  use(
    request: LoggableRequest,
    response: LoggableResponse,
    next: () => void,
  ): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      const path = (request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';

      logBuffer.pushRequest({
        method: request.method ?? 'UNKNOWN',
        path,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
        userId: request.user?.id ?? null,
        userEmail: request.user?.email ?? null,
        error: request.loggedErrorMessage ?? null,
      });
    });

    next();
  }
}
