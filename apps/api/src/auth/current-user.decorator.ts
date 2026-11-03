import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest, AuthUser } from './authed-request.js';

/**
 * 현재 로그인한 사용자를 주입합니다. `@UseGuards(SupabaseAuthGuard)` 와 함께 쓰세요.
 *
 * 가드 없이 쓰면 user 가 비어 있으므로, 조용히 undefined 를 넘기는 대신
 * 바로 터뜨려서 실수를 드러냅니다.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    if (!request.user) {
      throw new Error(
        'CurrentUser 를 쓰려면 해당 핸들러에 SupabaseAuthGuard 를 적용해야 합니다.',
      );
    }
    return request.user;
  },
);
