import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/authed-request.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { RateLimit } from '../usage/rate-limit.decorator.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import { CreateBugReportDto } from './dto/create-bug-report.dto.js';
import { FeedbackService } from './feedback.service.js';

@Controller('feedback')
@UseGuards(SupabaseAuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  /**
   * 버그 신고 → 관리자 메일.
   *
   * Claude 를 쓰지 않으므로 `CostGuard` 는 붙이지 않습니다.
   * 대신 한 사람이 메일을 퍼붓지 못하게 레이트리밋을 좁게 둡니다.
   */
  @Post('bug-report')
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 5, windowSec: 600 })
  reportBug(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBugReportDto,
  ): Promise<{ sent: true }> {
    return this.feedback.reportBug(user, dto);
  }
}
