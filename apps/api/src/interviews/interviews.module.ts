import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';

@Module({
  // DocumentsModule: 문서 소유권 확인 + 컨텍스트로 쓸 본문 조회
  // UsageModule: RateLimitGuard + CostGuard
  imports: [AuthModule, ClaudeModule, DocumentsModule, UsageModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}
