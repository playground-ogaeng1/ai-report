import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/authed-request.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { UsageService, type UsageSnapshot } from './usage.service.js';

@Controller('usage')
@UseGuards(SupabaseAuthGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  /**
   * 내 최근 사용량과 한도.
   *
   * 화면에 보여주려고 둡니다 — 한도에 걸렸을 때 429 만 뜨면 사용자가
   * 왜 막혔는지 알 수 없습니다.
   */
  @Get()
  snapshot(@CurrentUser() user: AuthUser): Promise<UsageSnapshot> {
    return this.usage.snapshot(user.id);
  }
}
