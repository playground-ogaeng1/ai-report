import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  // AuthModule: SupabaseAuthGuard + ProfileService
  // UsageModule: RateLimitGuard (업로드 빈도 제한)
  imports: [AuthModule, StorageModule, UsageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  // ReviewsModule 이 소유권 확인(findOne)에 씁니다.
  exports: [DocumentsService],
})
export class DocumentsModule {}
