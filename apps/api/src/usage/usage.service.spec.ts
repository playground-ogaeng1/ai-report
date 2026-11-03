import { UsageService } from './usage.service.js';

type Sums = { inputTokens: number | null; outputTokens: number | null };

function makeService(reviews: Sums, messages: Sums, limit?: string) {
  const prisma = {
    client: {
      review: {
        aggregate: vi.fn().mockResolvedValue({ _sum: reviews }),
      },
      message: {
        aggregate: vi.fn().mockResolvedValue({ _sum: messages }),
      },
    },
  };
  const config = { get: vi.fn(() => limit) };

  return {
    service: new UsageService(prisma as never, config as never),
    prisma,
  };
}

const EMPTY: Sums = { inputTokens: null, outputTokens: null };

describe('UsageService.limitTokens', () => {
  it('환경변수가 없으면 기본값을 쓴다', () => {
    const { service } = makeService(EMPTY, EMPTY, undefined);
    expect(service.limitTokens).toBe(300_000);
  });

  it('환경변수 값을 쓴다', () => {
    const { service } = makeService(EMPTY, EMPTY, '50000');
    expect(service.limitTokens).toBe(50_000);
  });

  it.each(['0', '-1', 'abc', ''])(
    '쓸 수 없는 값(%s)이면 기본값으로 돌아간다 — 실수로 가드를 끄면 안 된다',
    (raw) => {
      const { service } = makeService(EMPTY, EMPTY, raw);
      expect(service.limitTokens).toBe(300_000);
    },
  );
});

describe('UsageService.snapshot', () => {
  it('첨삭과 면접 토큰을 합산한다', async () => {
    const { service } = makeService(
      { inputTokens: 1_000, outputTokens: 2_000 },
      { inputTokens: 300, outputTokens: 700 },
    );

    const snapshot = await service.snapshot('user_1');

    expect(snapshot.inputTokens).toBe(1_300);
    expect(snapshot.outputTokens).toBe(2_700);
    expect(snapshot.totalTokens).toBe(4_000);
  });

  it('기록이 없으면 0 으로 다룬다 (aggregate 는 null 을 준다)', async () => {
    const { service } = makeService(EMPTY, EMPTY);

    const snapshot = await service.snapshot('user_1');

    expect(snapshot.totalTokens).toBe(0);
    expect(snapshot.exceeded).toBe(false);
  });

  it('한도에 닿으면 exceeded 를 세운다', async () => {
    const { service } = makeService(
      { inputTokens: 500, outputTokens: 500 },
      EMPTY,
      '1000',
    );

    const snapshot = await service.snapshot('user_1');

    expect(snapshot.totalTokens).toBe(1_000);
    expect(snapshot.exceeded).toBe(true);
    expect(snapshot.remainingTokens).toBe(0);
  });

  it('남은 양은 음수가 되지 않는다', async () => {
    const { service } = makeService(
      { inputTokens: 5_000, outputTokens: 0 },
      EMPTY,
      '1000',
    );

    expect((await service.snapshot('user_1')).remainingTokens).toBe(0);
  });

  it('구르는 24시간으로 집계한다 — 자정에 한도가 몰려 풀리지 않게', async () => {
    const { service, prisma } = makeService(EMPTY, EMPTY);
    const before = Date.now();

    const snapshot = await service.snapshot('user_1');

    expect(snapshot.windowHours).toBe(24);

    const reviewWhere = prisma.client.review.aggregate.mock.calls[0]?.[0] as {
      where: { userId: string; createdAt: { gte: Date } };
    };
    const since = reviewWhere.where.createdAt.gte.getTime();
    expect(reviewWhere.where.userId).toBe('user_1');
    // 24시간 전 ± 약간의 실행 시간
    expect(before - since).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(before - since).toBeLessThan(24 * 60 * 60 * 1000 + 5_000);
  });

  it('면접 메시지는 세션을 거쳐 사용자로 걸러낸다 — Message 에는 userId 가 없다', async () => {
    const { service, prisma } = makeService(EMPTY, EMPTY);

    await service.snapshot('user_1');

    const messageWhere = prisma.client.message.aggregate.mock.calls[0]?.[0] as {
      where: { session: { userId: string } };
    };
    expect(messageWhere.where.session).toEqual({ userId: 'user_1' });
  });
});
