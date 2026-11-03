import { Injectable } from '@nestjs/common';

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

/** 접근이 이만큼 쌓이면 죽은 키를 한 번 쓸어냅니다. */
const SWEEP_EVERY = 500;

/**
 * 슬라이딩 윈도 레이트리미터.
 *
 * ⚠️ **프로세스 메모리에 둡니다.** 인스턴스를 여러 개로 늘리면 각자
 * 자기 카운터를 들고 있어서 실효 한도가 인스턴스 수만큼 곱해집니다.
 * 수평 확장을 하게 되면 Redis 같은 공유 저장소로 바꿔야 합니다.
 * (지금 규모에서는 의존성을 하나 더 들이는 게 손해라 이렇게 둡니다)
 */
@Injectable()
export class RateLimitService {
  private readonly hits = new Map<string, number[]>();
  private accesses = 0;

  check(
    key: string,
    max: number,
    windowMs: number,
    now: number = Date.now(),
  ): RateLimitDecision {
    this.maybeSweep(now, windowMs);

    const cutoff = now - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);

    if (recent.length >= max) {
      // 가장 오래된 기록이 윈도를 벗어나면 한 칸이 빕니다.
      const oldest = recent[0]!;
      this.hits.set(key, recent);

      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);

    return { allowed: true };
  }

  /**
   * 쓰지 않는 키를 정리합니다.
   *
   * 타이머를 쓰지 않는 이유: 프로세스를 붙잡아 두고(테스트에서 특히 거슬림),
   * 요청이 없으면 정리할 것도 없습니다. 접근 횟수 기준으로 쓸어냅니다.
   */
  private maybeSweep(now: number, windowMs: number): void {
    if (++this.accesses % SWEEP_EVERY !== 0) return;

    const cutoff = now - windowMs;
    for (const [key, times] of this.hits) {
      if (times.every((at) => at <= cutoff)) this.hits.delete(key);
    }
  }
}
