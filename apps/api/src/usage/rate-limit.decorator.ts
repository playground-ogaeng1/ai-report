import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'ppp:rate-limit';

export type RateLimitOptions = {
  /** 윈도 안에서 허용하는 최대 요청 수 */
  max: number;
  /** 윈도 길이(초) */
  windowSec: number;
};

/**
 * 핸들러별 레이트리밋. 붙이지 않으면 가드의 기본값이 적용됩니다.
 *
 * 예) `@RateLimit({ max: 10, windowSec: 60 })`
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
