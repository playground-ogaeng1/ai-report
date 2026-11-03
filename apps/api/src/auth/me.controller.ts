import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '@ppp/db';
import { AdminService } from './admin.service.js';
import type { AuthUser } from './authed-request.js';
import { CurrentUser } from './current-user.decorator.js';
import { ProfileService } from './profile.service.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

/** 프로필 + 이 사용자가 관리자인지 */
export type MeResponse = User & { admin: boolean };

@Controller('me')
@UseGuards(SupabaseAuthGuard)
export class MeController {
  constructor(
    private readonly profiles: ProfileService,
    private readonly admins: AdminService,
  ) {}

  /**
   * 내 프로필. 없으면 만들어서 돌려줍니다.
   *
   * 로그인 직후 web 이 한 번 호출해서 `public.users` 에 행을 만드는 역할도
   * 겸합니다. web → api 인증 경로 전체를 검증하는 스모크 테스트이기도 합니다.
   *
   * `admin` 은 web 이 관리자 메뉴를 보여줄지 판단하는 데 씁니다. **화면에서
   * 숨기는 것은 편의일 뿐이고, 실제 차단은 api 의 AdminGuard 가 합니다.**
   */
  @Get()
  async getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    const profile = await this.profiles.ensureProfile(user);

    return { ...profile, admin: this.admins.isAdmin(user) };
  }
}
