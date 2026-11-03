export type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'verbose';

export type LogEntry = {
  at: string;
  level: LogLevel;
  /** NestJS 가 붙이는 컨텍스트 (보통 클래스명) */
  context: string | null;
  message: string;
};

export type RequestEntry = {
  at: string;
  method: string;
  path: string;
  status: number;
  /** 밀리초 */
  durationMs: number;
  /**
   * 호출자. 가드를 통과한 요청만 채워집니다 —
   * **인증 실패(401)는 둘 다 null** 이고, 그게 정상입니다
   * (누구인지 증명하지 못한 요청이므로).
   */
  userId: string | null;
  userEmail: string | null;
  /** 실패한 경우 메시지 */
  error: string | null;
};

export type EndpointStat = {
  key: string;
  count: number;
  errorCount: number;
  avgMs: number;
  maxMs: number;
};

const MAX_LOGS = 1_000;
const MAX_REQUESTS = 500;

/** 긴 문자열은 잘라서 담습니다 — 버퍼가 로그 하나로 가득 차면 안 됩니다. */
function clip(value: string, max = 2_000): string {
  return value.length > max ? `${value.slice(0, max)}… (${value.length}자)` : value;
}

/**
 * API 호출 기록과 로그를 담는 링 버퍼.
 *
 * **왜 DB 가 아닌가:** 요청마다 INSERT 를 하면 비용과 지연이 늘고, 운영
 * 데이터는 본래 휘발성입니다. 스키마도 건드리지 않습니다.
 *
 * ⚠️ 한계: **프로세스 재시작하면 사라지고, 인스턴스별로 따로 쌓입니다.**
 * 장기 보관이나 여러 인스턴스 통합이 필요해지면 외부 수집 도구로 보내야
 * 합니다. 지금은 "방금 무슨 일이 있었는지" 보는 용도입니다.
 *
 * 로거보다 먼저 만들어져야 해서(부트스트랩 때 필요) DI 가 아니라 모듈 수준
 * 싱글턴으로 둡니다. Nest 에는 `useValue` 로 꽂습니다.
 */
export class LogBuffer {
  private readonly logs: LogEntry[] = [];
  private readonly requests: RequestEntry[] = [];

  pushLog(level: LogLevel, message: string, context: string | null): void {
    this.logs.push({
      at: new Date().toISOString(),
      level,
      context,
      message: clip(message),
    });

    if (this.logs.length > MAX_LOGS) this.logs.shift();
  }

  pushRequest(entry: Omit<RequestEntry, 'at'>): void {
    this.requests.push({
      at: new Date().toISOString(),
      ...entry,
      error: entry.error === null ? null : clip(entry.error, 500),
    });

    if (this.requests.length > MAX_REQUESTS) this.requests.shift();
  }

  /** 최신순 */
  recentLogs(limit: number, level?: LogLevel): LogEntry[] {
    const filtered = level
      ? this.logs.filter((entry) => entry.level === level)
      : this.logs;

    return filtered.slice(-limit).reverse();
  }

  /** 최신순 */
  recentRequests(limit: number): RequestEntry[] {
    return this.requests.slice(-limit).reverse();
  }

  /**
   * 엔드포인트별 집계.
   *
   * 경로의 ID 를 `:id` 로 바꿔 묶습니다 — 안 그러면 문서마다 다른 줄이 되어
   * 집계가 의미를 잃습니다.
   */
  endpointStats(): EndpointStat[] {
    const groups = new Map<string, { ms: number[]; errors: number }>();

    for (const entry of this.requests) {
      const key = `${entry.method} ${normalizePath(entry.path)}`;
      const group = groups.get(key) ?? { ms: [], errors: 0 };

      group.ms.push(entry.durationMs);
      if (entry.status >= 400) group.errors += 1;
      groups.set(key, group);
    }

    return [...groups]
      .map(([key, group]) => ({
        key,
        count: group.ms.length,
        errorCount: group.errors,
        avgMs: Math.round(
          group.ms.reduce((sum, ms) => sum + ms, 0) / group.ms.length,
        ),
        maxMs: Math.max(...group.ms),
      }))
      .sort((a, b) => b.count - a.count);
  }

  counts(): { logs: number; requests: number } {
    return { logs: this.logs.length, requests: this.requests.length };
  }
}

/** cuid·UUID 처럼 보이는 조각을 `:id` 로 바꿉니다. */
export function normalizePath(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      const looksLikeId =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          segment,
        ) || /^c[a-z0-9]{20,}$/i.test(segment);

      return looksLikeId ? ':id' : segment;
    })
    .join('/');
}

/** 부트스트랩(로거 생성)보다 먼저 필요해서 모듈 수준 싱글턴으로 둡니다. */
export const logBuffer = new LogBuffer();
