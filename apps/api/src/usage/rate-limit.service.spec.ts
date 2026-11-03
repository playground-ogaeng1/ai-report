import { RateLimitService } from './rate-limit.service.js';

const WINDOW = 60_000;
const MAX = 3;

describe('RateLimitService', () => {
  let limiter: RateLimitService;

  beforeEach(() => {
    limiter = new RateLimitService();
  });

  it('한도까지는 통과시킨다', () => {
    const now = 1_000_000;

    for (let i = 0; i < MAX; i++) {
      expect(limiter.check('k', MAX, WINDOW, now + i).allowed).toBe(true);
    }
  });

  it('한도를 넘으면 막고 대기 시간을 알려준다', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX; i++) limiter.check('k', MAX, WINDOW, now);

    const decision = limiter.check('k', MAX, WINDOW, now);

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      // 윈도가 60초이고 방금 3번 다 썼으니 60초쯤 기다려야 합니다.
      expect(decision.retryAfterSec).toBe(60);
    }
  });

  it('윈도가 지나면 다시 통과한다', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX; i++) limiter.check('k', MAX, WINDOW, now);

    expect(limiter.check('k', MAX, WINDOW, now).allowed).toBe(false);
    // 윈도 경계를 막 넘긴 시점
    expect(limiter.check('k', MAX, WINDOW, now + WINDOW + 1).allowed).toBe(true);
  });

  it('윈도가 슬라이딩한다 — 가장 오래된 기록만 빠진다', () => {
    const now = 1_000_000;

    limiter.check('k', MAX, WINDOW, now); // t=0
    limiter.check('k', MAX, WINDOW, now + 30_000); // t=30s
    limiter.check('k', MAX, WINDOW, now + 40_000); // t=40s
    // 여기서 한도 소진
    expect(limiter.check('k', MAX, WINDOW, now + 41_000).allowed).toBe(false);

    // t=61s — 첫 기록(t=0)만 윈도를 벗어나므로 한 칸이 빕니다.
    expect(limiter.check('k', MAX, WINDOW, now + 61_000).allowed).toBe(true);
    // 그 다음은 다시 막혀야 합니다 (t=30s, 40s, 61s 가 살아 있음)
    expect(limiter.check('k', MAX, WINDOW, now + 61_001).allowed).toBe(false);
  });

  it('키마다 예산이 따로다 — 첨삭을 많이 썼다고 면접이 막히면 안 된다', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX; i++) limiter.check('reviews:user_1', MAX, WINDOW, now);

    expect(limiter.check('reviews:user_1', MAX, WINDOW, now).allowed).toBe(false);
    expect(limiter.check('interviews:user_1', MAX, WINDOW, now).allowed).toBe(
      true,
    );
  });

  it('사용자마다 예산이 따로다', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX; i++) limiter.check('r:user_1', MAX, WINDOW, now);

    expect(limiter.check('r:user_2', MAX, WINDOW, now).allowed).toBe(true);
  });

  it('대기 시간은 최소 1초 — 0초를 주면 클라이언트가 즉시 재시도한다', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX; i++) limiter.check('k', MAX, WINDOW, now);

    // 윈도 경계 직전
    const decision = limiter.check('k', MAX, WINDOW, now + WINDOW - 1);

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
