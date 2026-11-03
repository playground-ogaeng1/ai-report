import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Review } from '@ppp/db';
import type { AuthUser } from '../auth/authed-request.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { streamNdjson, type StreamingResponse } from '../common/ndjson.js';
import { CostGuard } from '../usage/cost.guard.js';
import { RateLimit } from '../usage/rate-limit.decorator.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import { ReviewsService } from './reviews.service.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('documents/:documentId/reviews')
  list(
    @CurrentUser() user: AuthUser,
    @Param('documentId') documentId: string,
  ): Promise<Review[]> {
    return this.reviews.listForDocument(user.id, documentId);
  }

  /**
   * 첨삭 생성. 응답은 NDJSON 스트림입니다.
   *
   *   {"type":"text","text":"### 한 줄 평\n..."}
   *   {"type":"done","reviewId":"..."}
   *   {"type":"error","message":"..."}
   */
  @Post('documents/:documentId/reviews')
  // 첨삭 1회가 30초 안팎이라 분당 10회면 정상 사용에는 닿지 않습니다.
  @UseGuards(RateLimitGuard, CostGuard)
  @RateLimit({ max: 10, windowSec: 60 })
  async create(
    @CurrentUser() user: AuthUser,
    @Param('documentId') documentId: string,
    @Res() res: StreamingResponse,
  ): Promise<void> {
    // 본문을 흘려보내기 전에 끝낼 수 있는 실패(404/503)는 여기서 처리됩니다.
    const document = await this.reviews.prepare(user.id, documentId);

    await streamNdjson(res, this.reviews.stream(user.id, document));
  }

  @Delete('reviews/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.reviews.remove(user.id, id);
  }
}
