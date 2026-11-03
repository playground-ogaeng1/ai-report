import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from './authed-request.js';

/**
 * 관리자 판별.
 *
 * `ADMIN_EMAILS` 에 쉼표로 구분해 넣습니다. 서버 환경변수라 web 으로 넘어가지
 * 않고, 브라우저에서 바꿀 수도 없습니다.
 *
 * **미설정이면 아무도 관리자가 아닙니다.** 실수로 비워 두면 전원 관리자가 되는
 * 쪽이 아니라, 전원 비관리자가 되는 쪽으로 닫습니다.
 *
 * 사용자 ID(UUID)가 아니라 이메일로 보는 이유: 구글 로그인이라 이메일이
 * 안정적이고, 사람이 직접 설정값에 적기 쉽습니다. 이메일은 Supabase 가 검증한
 * JWT 클레임에서 옵니다 — 클라이언트가 보낸 값이 아닙니다.
 */
@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * 기동 시 설정 상태를 한 줄 남깁니다.
   *
   * `.env` 를 고쳐도 `nest --watch` 는 재시작하지 않으므로, 값이 실제로
   * 로드됐는지 확인할 방법이 필요합니다. **이메일 자체는 찍지 않습니다** —
   * 개수만 있으면 로드 여부를 알 수 있습니다.
   */
  onModuleInit(): void {
    const count = this.allowedEmails.length;

    if (count === 0) {
      this.logger.warn(
        '관리자가 설정되지 않았습니다 — /admin 조회는 아무도 할 수 없습니다. (ADMIN_EMAILS)',
      );
      return;
    }
    this.logger.log(`관리자 ${count}명 설정됨 (ADMIN_EMAILS)`);
  }

  private get allowedEmails(): string[] {
    const raw = this.config.get<string>('ADMIN_EMAILS') ?? '';

    return raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  isAdmin(user: AuthUser): boolean {
    const allowed = this.allowedEmails;
    if (allowed.length === 0) return false;

    return user.email !== null && allowed.includes(user.email.toLowerCase());
  }
}
