import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';

@Module({
  // AuthModule: SupabaseAuthGuard / UsageModule: RateLimitGuard
  imports: [AuthModule, UsageModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
