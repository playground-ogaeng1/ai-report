import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import type { AuthedRequest } from './authed-request.js';

/**
 * 관리자만 통과. **`SupabaseAuthGuard` 뒤에 와야 합니다.**
 *
 * 403 이 아니라 **404** 를 던집니다 — 403 은 "그 엔드포인트가 존재하고 너는
 * 권한이 없다" 를 알려주는 셈입니다. 관리자 화면은 존재 자체를 숨깁니다.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly admins: AdminService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    if (!request.user) {
      throw new Error('AdminGuard 는 SupabaseAuthGuard 뒤에 적용해야 합니다.');
    }
    if (!this.admins.isAdmin(request.user)) {
      throw new NotFoundException();
    }

    return true;
  }
}
