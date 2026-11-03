import { type ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { LoggableRequest } from '../monitoring/request-log.middleware.js';

function messageOf(exception: unknown): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null) {
      const { message } = response as { message?: unknown };
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
    return exception.message;
  }

  return exception instanceof Error ? exception.message : String(exception);
}

/**
 * 예외 메시지를 요청에 적어 두는 필터.
 *
 * 기록은 `RequestLogMiddleware` 가 `finish` 시점에 합니다. 그런데 그 시점에는
 * 예외 객체를 볼 수 없어서, 여기서 메시지만 요청에 얹어 전달합니다.
 *
 * `BaseExceptionFilter` 를 상속해 `super.catch()` 를 호출하는 이유:
 * **응답 형식을 그대로 유지**하기 위해서입니다. 직접 응답을 만들면
 * `{message, error, statusCode}` 모양을 다시 구현해야 하고, web 의
 * `readErrorMessage` 가 그 모양에 의존합니다.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<LoggableRequest>();
    request.loggedErrorMessage = messageOf(exception);

    super.catch(exception, host);
  }
}
