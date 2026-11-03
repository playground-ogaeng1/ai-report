import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CostGuard } from './cost.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitService } from './rate-limit.service.js';
import { UsageController } from './usage.controller.js';
import { UsageService } from './usage.service.js';

/**
 * 과도한 사용을 막는 두 가지 장치.
 *
 *  · RateLimitGuard — 짧은 시간에 몰아치는 요청 (메모리, 프로세스 단위)
 *  · CostGuard      — 24시간 누적 토큰 (DB 집계, 인스턴스 무관)
 *
 * `RateLimitService` 는 이 모듈이 들고 있는 하나의 인스턴스를 공유합니다.
 * 모듈을 import 하는 쪽이 각자 만들지 않습니다.
 */
@Module({
  imports: [AuthModule],
  controllers: [UsageController],
  providers: [RateLimitService, UsageService, RateLimitGuard, CostGuard],
  exports: [RateLimitService, UsageService, RateLimitGuard, CostGuard],
})
export class UsageModule {}
