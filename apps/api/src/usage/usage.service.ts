import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

export type UsageSnapshot = {
  /** 집계 구간 길이(시간) */
  windowHours: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limitTokens: number;
  remainingTokens: number;
  /** 한도를 넘었는지 */
  exceeded: boolean;
};

const WINDOW_HOURS = 24;

/**
 * 기본 한도.
 *
 * 첨삭 1회가 대략 3천 토큰, 면접 턴 1회가 2천 토큰 안팎이라 하루 100회
 * 정도까지는 닿지 않는 수준으로 잡았습니다. 실제 사용량을 보고
 * `DAILY_TOKEN_LIMIT` 로 조정하세요.
 */
const DEFAULT_LIMIT = 300_000;

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get limitTokens(): number {
    const raw = Number(this.config.get<string>('DAILY_TOKEN_LIMIT'));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LIMIT;
  }

  /**
   * 최근 24시간 토큰 사용량.
   *
   * 달력 기준 "오늘" 이 아니라 **구르는 24시간**을 씁니다 — 타임존을 정하지
   * 않아도 되고, 자정에 한도가 한꺼번에 풀려 몰리는 일도 없습니다.
   *
   * 참고: 저장된 `inputTokens` 는 Claude 가 돌려준 값이라 **프롬프트 캐시로
   * 읽은 토큰은 빠져 있습니다.** 즉 정가로 과금된 양에 가깝습니다.
   */
  async snapshot(userId: string): Promise<UsageSnapshot> {
    const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    const [reviews, messages] = await Promise.all([
      this.prisma.client.review.aggregate({
        _sum: { inputTokens: true, outputTokens: true },
        where: { userId, createdAt: { gte: since } },
      }),
      // Message 에는 userId 가 없어서 세션을 거쳐 걸러냅니다.
      this.prisma.client.message.aggregate({
        _sum: { inputTokens: true, outputTokens: true },
        where: { createdAt: { gte: since }, session: { userId } },
      }),
    ]);

    const inputTokens =
      (reviews._sum.inputTokens ?? 0) + (messages._sum.inputTokens ?? 0);
    const outputTokens =
      (reviews._sum.outputTokens ?? 0) + (messages._sum.outputTokens ?? 0);

    const totalTokens = inputTokens + outputTokens;
    const limitTokens = this.limitTokens;

    return {
      windowHours: WINDOW_HOURS,
      inputTokens,
      outputTokens,
      totalTokens,
      limitTokens,
      remainingTokens: Math.max(0, limitTokens - totalTokens),
      exceeded: totalTokens >= limitTokens,
    };
  }
}
