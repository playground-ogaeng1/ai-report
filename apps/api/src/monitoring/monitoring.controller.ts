import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  type EndpointStat,
  type LogEntry,
  type LogLevel,
  logBuffer,
  type RequestEntry,
} from './log-buffer.js';

const LOG_LEVELS: readonly LogLevel[] = [
  'log',
  'warn',
  'error',
  'debug',
  'verbose',
];

/** 쿼리로 들어온 limit 을 안전한 범위로 가둡니다. */
function toLimit(raw: string | undefined, fallback: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return Math.min(Math.floor(parsed), max);
}

/**
 * 운영 조회용 엔드포인트. **관리자만** 접근할 수 있습니다.
 *
 * 가드 두 개를 순서대로 겁니다 — 인증(401) → 관리자(404).
 */
@Controller('admin')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class MonitoringController {
  /** 최근 API 호출 (최신순) */
  @Get('requests')
  requests(@Query('limit') limit?: string): RequestEntry[] {
    return logBuffer.recentRequests(toLimit(limit, 100, 500));
  }

  /** 최근 백엔드 로그 (최신순). `?level=error` 로 걸러낼 수 있습니다. */
  @Get('logs')
  logs(
    @Query('limit') limit?: string,
    @Query('level') level?: string,
  ): LogEntry[] {
    const parsed = LOG_LEVELS.find((candidate) => candidate === level);

    return logBuffer.recentLogs(toLimit(limit, 200, 1_000), parsed);
  }

  /** 엔드포인트별 호출 수·에러 수·소요시간 */
  @Get('stats')
  stats(): {
    endpoints: EndpointStat[];
    buffered: { logs: number; requests: number };
    uptimeSec: number;
  } {
    return {
      endpoints: logBuffer.endpointStats(),
      buffered: logBuffer.counts(),
      uptimeSec: Math.floor(process.uptime()),
    };
  }
}
