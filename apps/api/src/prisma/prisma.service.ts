import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, type Db } from '@ppp/db';

/**
 * Prisma 7 은 드라이버 어댑터가 필수라서 `extends PrismaClient` 대신
 * 합성(composition) 으로 감쌉니다. 사용법: `prisma.client.document.findMany()`
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly client: Db;

  constructor(config: ConfigService) {
    this.client = createPrismaClient(config.get<string>('DATABASE_URL'));
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.$connect();
      this.logger.log('Connected to PostgreSQL (Supabase)');
    } catch (error) {
      // 여기서 throw 하면 서버가 아예 안 뜨므로 경고만 남깁니다.
      // 연결 상태는 GET /health 로 확인할 수 있습니다.
      this.logger.warn(
        `DB 연결 실패 — 루트 .env 의 DATABASE_URL 을 확인하세요 (SETUP.md 참고): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
