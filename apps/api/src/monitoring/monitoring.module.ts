import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MonitoringController } from './monitoring.controller.js';

/**
 * 운영 조회(관리자 전용).
 *
 * 수집은 `main.ts` 에서 꽂는 로거·인터셉터가 담당하고, 저장은 모듈 수준
 * 싱글턴 링 버퍼에 합니다. 이 모듈은 **읽기만** 제공합니다.
 */
@Module({
  // AuthModule: SupabaseAuthGuard + AdminGuard
  imports: [AuthModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
