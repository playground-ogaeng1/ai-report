import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 부터는 .env 를 자동으로 읽지 않습니다. 루트 .env 를 명시적으로 로드합니다.
// (prisma 명령은 항상 cwd = packages/db 에서 실행되므로 상대 경로가 안전합니다)
config({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // 마이그레이션 / Studio 는 커넥션 풀러를 우회해야 하므로 DIRECT_URL 을 씁니다.
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
});
