import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { InterviewSession } from '@ppp/db';
import type { AuthUser } from '../auth/authed-request.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { streamNdjson, type StreamingResponse } from '../common/ndjson.js';
import { CostGuard } from '../usage/cost.guard.js';
import { RateLimit } from '../usage/rate-limit.decorator.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import { CreateInterviewDto, SendMessageDto } from './dto/interview.dto.js';
import {
  type InterviewDetail,
  type InterviewListItem,
  InterviewsService,
} from './interviews.service.js';

@Controller('interviews')
@UseGuards(SupabaseAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<InterviewListItem[]> {
    return this.interviews.list(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<InterviewDetail> {
    return this.interviews.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInterviewDto,
  ): Promise<InterviewSession> {
    return this.interviews.create(user, dto);
  }

  /**
   * 답변을 보내고 면접관의 다음 질문을 받습니다. (NDJSON 스트림)
   *
   * `content` 를 비우면 답변 없이 면접관 턴만 생성합니다 —
   * 첫 질문과, 실패 후 재시도에 씁니다.
   */
  @Post(':id/messages')
  // 면접 턴은 짧아서 연달아 보낼 수 있습니다. 첨삭보다 넉넉하게 둡니다.
  @UseGuards(RateLimitGuard, CostGuard)
  @RateLimit({ max: 20, windowSec: 60 })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: StreamingResponse,
  ): Promise<void> {
    const { session, document } = await this.interviews.prepareTurn(
      user.id,
      id,
      dto.content,
    );

    await streamNdjson(res, this.interviews.streamTurn(session, document));
  }

  /** 면접 종료 + 총평 생성. (NDJSON 스트림) */
  @Post(':id/summary')
  // 총평은 면접당 한 번이면 충분합니다.
  @UseGuards(RateLimitGuard, CostGuard)
  @RateLimit({ max: 5, windowSec: 60 })
  async summary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: StreamingResponse,
  ): Promise<void> {
    const session = await this.interviews.prepareSummary(user.id, id);

    await streamNdjson(res, this.interviews.streamSummary(session));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.interviews.remove(user.id, id);
  }
}
