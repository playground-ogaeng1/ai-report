import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import { MeController } from './me.controller.js';
import { ProfileService } from './profile.service.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

/**
 * 로그인 자체는 Supabase Auth 가 담당합니다. 이 모듈은 전달받은 액세스
 * 토큰(JWT)을 검증해 호출자를 식별하고, `public.users` 프로필을 관리합니다.
 *
 * SupabaseAuthGuard 가 필요한 모듈은 이 모듈을 import 하세요.
 */
@Module({
  controllers: [MeController],
  providers: [SupabaseAuthGuard, ProfileService, AdminService, AdminGuard],
  exports: [SupabaseAuthGuard, ProfileService, AdminService, AdminGuard],
})
export class AuthModule {}
