import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

// 모델 타입(User, Document 등)과 enum 을 그대로 재export → apps/api, apps/web 에서 import 가능
export * from './generated/prisma/client.js';

/**
 * Prisma 7 은 드라이버 어댑터가 필수입니다.
 * (어댑터 없이 `new PrismaClient()` 를 호출하면 런타임 에러)
 */
export function createPrismaClient(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL 이 설정되지 않았습니다. 루트 .env 에 Supabase 연결 문자열을 넣어주세요. (SETUP.md 참고)',
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export type Db = PrismaClient;
