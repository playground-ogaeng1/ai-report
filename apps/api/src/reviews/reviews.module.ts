import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  // DocumentsModule: 소유권 확인용 DocumentsService.findOne
  // UsageModule: RateLimitGuard + CostGuard
  imports: [AuthModule, ClaudeModule, DocumentsModule, UsageModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
