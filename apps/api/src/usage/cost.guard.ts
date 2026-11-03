import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { AuthedRequest } from '../auth/authed-request.js';
import { UsageService } from './usage.service.js';

/**
 * 토큰 누적 사용량 가드. **Claude 를 호출하는 엔드포인트에만** 붙입니다.
 *
 * 레이트리밋이 "짧은 시간에 몰아치는 것"을 막는다면, 이쪽은 "하루 종일
 * 꾸준히 써서 요금이 쌓이는 것"을 막습니다. 둘은 다른 문제라 따로 둡니다.
 *
 * **`SupabaseAuthGuard` 뒤에 와야 합니다.**
 */
@Injectable()
export class CostGuard implements CanActivate {
  constructor(private readonly usage: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user) {
      throw new Error('CostGuard 는 SupabaseAuthGuard 뒤에 적용해야 합니다.');
    }

    const snapshot = await this.usage.snapshot(request.user.id);

    if (snapshot.exceeded) {
      throw new HttpException(
        `최근 ${snapshot.windowHours}시간 사용량이 한도에 도달했습니다 ` +
          `(${snapshot.totalTokens.toLocaleString()} / ${snapshot.limitTokens.toLocaleString()} 토큰). ` +
          '잠시 후 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
