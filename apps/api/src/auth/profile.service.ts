import { Injectable } from '@nestjs/common';
import type { User } from '@ppp/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './authed-request.js';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `public.users` 에 프로필을 보장합니다.
   *
   * 계정 자체는 Supabase 가 `auth.users` 에 만들고, 우리 쪽에는 아무것도
   * 생기지 않습니다. 도메인 테이블들이 참조할 행이 필요하므로 첫 호출 때
   * 만들고, 이후에는 이름/사진 변경만 반영합니다.
   *
   * id 는 Supabase 사용자 UUID 를 그대로 씁니다.
   */
  ensureProfile(user: AuthUser): Promise<User> {
    return this.prisma.client.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      update: {
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  }
}
