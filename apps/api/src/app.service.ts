import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

export type HealthResult =
  | { ok: true; db: 'up' }
  | { ok: false; db: 'down'; message: string };

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'ppp API is running. Try GET /health';
  }

  /** DB 까지 실제 왕복해서 연결 상태를 확인합니다. */
  async getHealth(): Promise<HealthResult> {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { ok: true, db: 'up' };
    } catch (error) {
      return {
        ok: false,
        db: 'down',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
